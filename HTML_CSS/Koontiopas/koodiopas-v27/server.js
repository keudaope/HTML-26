import express from "express";
import dotenv from "dotenv";
import session from "express-session";
import fs from "fs";
import crypto from "crypto";
import os from "os";
import path from "path";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";

const LOCAL_DATA_DIR = path.resolve("./data");
const DATA_DIR = path.resolve(
  process.env.KOODIOPAS_DATA_DIR?.trim() ||
  path.join(os.homedir(), ".koodiopas", "data")
);

const FILES = {
  groups: path.join(DATA_DIR, "groups.json"),
  courses: path.join(DATA_DIR, "courses.json"),
  distributions: path.join(DATA_DIR, "distributions.json"),
  analytics: path.join(DATA_DIR, "analytics.json"),
  submissions: path.join(DATA_DIR, "submissions.json"),
  rubrics: path.join(DATA_DIR, "rubrics.json"),
  settings: path.join(DATA_DIR, "app-settings.json")
};

const DATA_DEFAULTS = {
  [FILES.groups]: { groups: [] },
  [FILES.courses]: { courses: [] },
  [FILES.distributions]: { distributions: [] },
  [FILES.analytics]: { events: [] },
  [FILES.submissions]: { submissions: [] },
  [FILES.rubrics]: { rubrics: [] },
  [FILES.settings]: {
    githubOrg: "",
    defaultRepoPrivate: true,
    teacherMessage: "Kirjaudu GitHubilla. Koodiopas näyttää vain sinulle kuuluvat tehtävät."
  }
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function localDataFileFor(targetFile) {
  return path.join(LOCAL_DATA_DIR, path.basename(targetFile));
}

function hasMeaningfulData(obj) {
  if (!obj || typeof obj !== "object") return false;
  for (const value of Object.values(obj)) {
    if (Array.isArray(value) && value.length > 0) return true;
    if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0) return true;
    if (typeof value === "string" && value.trim()) return true;
    if (typeof value === "boolean" && value) return true;
  }
  return false;
}

function seedPersistentDataFromLocal(report) {
  if (path.resolve(DATA_DIR) === path.resolve(LOCAL_DATA_DIR)) return;

  for (const targetFile of Object.keys(DATA_DEFAULTS)) {
    if (fs.existsSync(targetFile)) continue;

    const localFile = localDataFileFor(targetFile);
    if (!fs.existsSync(localFile)) continue;

    try {
      const parsed = JSON.parse(fs.readFileSync(localFile, "utf8"));
      if (!hasMeaningfulData(parsed)) continue;
      fs.copyFileSync(localFile, targetFile);
      report.push({
        file: targetFile,
        action: "imported-from-local",
        source: localFile
      });
    } catch {
      // Rikkinäistä paikallista tiedostoa ei kopioida pysyvään dataan.
    }
  }
}

function mergeDefaults(existing, defaults) {
  if (Array.isArray(defaults)) return Array.isArray(existing) ? existing : defaults;
  if (defaults && typeof defaults === "object") {
    const result = existing && typeof existing === "object" && !Array.isArray(existing) ? { ...existing } : {};
    for (const [key, value] of Object.entries(defaults)) {
      result[key] = key in result ? mergeDefaults(result[key], value) : value;
    }
    return result;
  }
  return existing === undefined ? defaults : existing;
}

function migrateData() {
  ensureDataDir();
  const report = [];

  // Ensimmäisellä v25-käynnistyksellä vanha version mukana oleva ./data
  // voidaan siirtää yhteiseen ~/.koodiopas/data -hakemistoon automaattisesti.
  seedPersistentDataFromLocal(report);

  for (const [file, defaults] of Object.entries(DATA_DEFAULTS)) {
    if (!fs.existsSync(file)) {
      writeJson(file, defaults);
      report.push({ file, action: "created" });
      continue;
    }

    let current;
    try {
      current = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      const backup = `${file}.invalid-${Date.now()}.bak`;
      fs.copyFileSync(file, backup);
      writeJson(file, defaults);
      report.push({ file, action: "repaired", backup });
      continue;
    }

    const merged = mergeDefaults(current, defaults);
    if (JSON.stringify(merged) !== JSON.stringify(current)) {
      writeJson(file, merged);
      report.push({ file, action: "updated" });
    } else {
      report.push({ file, action: "ok" });
    }
  }

  const coursesData = readJson(FILES.courses, { courses: [] });
  let courseChanged = false;
  for (const course of coursesData.courses || []) {
    if (!Array.isArray(course.groupIds)) { course.groupIds = []; courseChanged = true; }
    if (!Array.isArray(course.assignments)) { course.assignments = []; courseChanged = true; }
    for (const assignment of course.assignments) {
      const defaults = {
        templateRepoUrl: "",
        repoPrefix: assignment.name || "tehtava",
        instructions: "",
        maxHintLevel: 3,
        privateRepo: true,
        allowFullSolution: false,
        minAttemptsBeforeFullSolution: 4
      };
      for (const [key, value] of Object.entries(defaults)) {
        if (!(key in assignment)) {
          assignment[key] = value;
          courseChanged = true;
        }
      }
    }
  }
  if (courseChanged) {
    writeJson(FILES.courses, coursesData);
    report.push({ file: FILES.courses, action: "schema-updated" });
  }

  const groupsData = readJson(FILES.groups, { groups: [] });
  let groupChanged = false;
  for (const group of groupsData.groups || []) {
    if (!Array.isArray(group.students)) { group.students = []; groupChanged = true; }
    for (const student of group.students) {
      if (!("githubUsername" in student)) {
        student.githubUsername = "";
        groupChanged = true;
      }
    }
  }
  if (groupChanged) {
    writeJson(FILES.groups, groupsData);
    report.push({ file: FILES.groups, action: "schema-updated" });
  }

  return report;
}


app.use(express.json({ limit: "8mb" }));
app.use(express.static("public"));

app.use(session({
  secret: process.env.SESSION_SECRET || "vaihda-tama-tuotannossa",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

function readJson(path, fallback) {
  try { return JSON.parse(fs.readFileSync(path, "utf8")); }
  catch { return fallback; }
}
function writeJson(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
}
function settings() {
  return readJson(FILES.settings, {
    githubOrg: "",
    defaultRepoPrivate: true,
    teacherMessage: ""
  });
}
function slug(value) {
  return String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function base64url(buffer) {
  return buffer.toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
function requireTeacher(req, res, next) {
  if (req.session?.teacher === true) return next();
  res.status(401).json({ error: "Opettajan kirjautuminen vaaditaan." });
}
function requireStudent(req, res, next) {
  if (req.session?.studentGithub?.login) return next();
  res.status(401).json({ error: "GitHub-kirjautuminen vaaditaan." });
}
function ghHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Koodiopas-v27"
  };
}
async function ghJson(url, options = {}) {
  const response = await fetch(url, options);
  let data = null;
  try { data = await response.json(); } catch {}
  if (!response.ok) {
    throw new Error(data?.message || `GitHub API ${response.status}`);
  }
  return data;
}

function expectedRepoName(assignment, student) {
  return `${slug(assignment.repoPrefix || assignment.name)}-${slug(student.githubUsername || student.id || student.name)}`;
}
function expectedRepoUrl(assignment, student) {
  const org = settings().githubOrg;
  return org ? `https://github.com/${org}/${expectedRepoName(assignment, student)}` : "";
}
function findStudentByGithub(login) {
  const groups = readJson(FILES.groups, { groups: [] }).groups || [];
  const needle = String(login || "").toLowerCase();
  for (const group of groups) {
    for (const student of group.students || []) {
      if (String(student.githubUsername || "").toLowerCase() === needle) {
        return { group, student };
      }
    }
  }
  return null;
}
function studentWorkspace(login) {
  const match = findStudentByGithub(login);
  if (!match) return { matched: false, courses: [] };

  const courses = readJson(FILES.courses, { courses: [] }).courses || [];
  return {
    matched: true,
    student: {
      id: match.student.id,
      name: match.student.name,
      githubUsername: match.student.githubUsername
    },
    group: { id: match.group.id, name: match.group.name },
    courses: courses
      .filter(course => (course.groupIds || []).includes(match.group.id))
      .map(course => ({
        id: course.id,
        name: course.name,
        assignments: (course.assignments || []).map(assignment => ({
          ...assignment,
          repoUrl: expectedRepoUrl(assignment, match.student)
        }))
      }))
  };
}

async function studentRepositoryStatus(repoUrl, token) {
  const { owner, repo } = parseGithubRepoUrl(repoUrl);

  // 1) Onko repository jo opiskelijan käytettävissä?
  const direct = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { headers: ghHeaders(token) }
  );

  if (direct.ok) {
    const info = await direct.json();

    let latestCommit = null;
    const commitsResponse = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=1`,
      { headers: ghHeaders(token) }
    );
    if (commitsResponse.ok) {
      const commits = await commitsResponse.json();
      if (Array.isArray(commits) && commits[0]) {
        latestCommit = {
          sha: commits[0].sha,
          shortSha: String(commits[0].sha || "").slice(0, 7),
          message: commits[0].commit?.message || "",
          author: commits[0].commit?.author?.name || commits[0].author?.login || "",
          date: commits[0].commit?.author?.date || "",
          htmlUrl: commits[0].html_url || ""
        };
      }
    }

    return {
      status: "ready",
      accessible: true,
      private: Boolean(info.private),
      defaultBranch: info.default_branch || "",
      cloneUrl: info.clone_url || `https://github.com/${owner}/${repo}.git`,
      sshUrl: info.ssh_url || "",
      htmlUrl: info.html_url || repoUrl,
      latestCommit
    };
  }

  // 2) Jos repo ei vielä avaudu, etsitään opiskelijan avoimista kutsuista juuri tämä repo.
  const invitationsResponse = await fetch(
    "https://api.github.com/user/repository_invitations?per_page=100",
    { headers: ghHeaders(token) }
  );

  if (invitationsResponse.ok) {
    const invitations = await invitationsResponse.json();
    const fullName = `${owner}/${repo}`.toLowerCase();
    const invitation = (Array.isArray(invitations) ? invitations : []).find(item =>
      String(item.repository?.full_name || "").toLowerCase() === fullName
    );

    if (invitation) {
      return {
        status: "invitation_pending",
        accessible: false,
        invitationId: invitation.id,
        invitationUrl: invitation.html_url || `https://github.com/${owner}/${repo}/invitations`,
        permissions: invitation.permissions || "",
        htmlUrl: invitation.repository?.html_url || repoUrl
      };
    }
  }

  return {
    status: direct.status === 404 ? "not_found_or_no_access" : "error",
    accessible: false,
    httpStatus: direct.status,
    htmlUrl: repoUrl
  };
}

function appendAnalytics(event) {
  const data = readJson(FILES.analytics, { events: [] });
  data.events.push({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...event
  });
  if (data.events.length > 15000) data.events = data.events.slice(-15000);
  writeJson(FILES.analytics, data);
}
function findCourseAssignment(courseId, assignmentId) {
  const courses = readJson(FILES.courses, { courses: [] }).courses || [];
  const course = courses.find(c => c.id === courseId);
  const assignment = course?.assignments?.find(a => a.id === assignmentId);
  return { course, assignment };
}
function findGroup(groupId) {
  return (readJson(FILES.groups, { groups: [] }).groups || []).find(g => g.id === groupId);
}
function parseGithubRepoUrl(url) {
  let u;
  try { u = new URL(url); }
  catch { throw new Error("Repository-osoite ei ole kelvollinen URL."); }
  const parts = u.pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (!["github.com", "www.github.com"].includes(u.hostname) || parts.length < 2) {
    throw new Error("Repository-osoitteen pitää olla GitHub-osoite muodossa https://github.com/omistaja/repo.");
  }
  return { owner: parts[0], repo: parts[1].replace(/\.git$/i, "") };
}

const allowedExt = new Set([".html",".htm",".css",".js",".jsx",".ts",".tsx",".cs",".csproj",".json",".md",".txt"]);
function extension(path) {
  const i = path.lastIndexOf(".");
  return i < 0 ? "" : path.slice(i).toLowerCase();
}
function includePath(path) {
  if (/(^|\/)(node_modules|bin|obj|dist|build|\.git)(\/|$)/i.test(path)) return false;
  return allowedExt.has(extension(path));
}
async function fetchRepoFiles(repoUrl, token) {
  const { owner, repo } = parseGithubRepoUrl(repoUrl);
  const info = await ghJson(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
    headers: ghHeaders(token)
  });
  const tree = await ghJson(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(info.default_branch)}?recursive=1`,
    { headers: ghHeaders(token) }
  );

  const paths = (tree.tree || [])
    .filter(item => item.type === "blob" && includePath(item.path))
    .map(item => item.path)
    .slice(0, 30);

  const files = [];
  for (const path of paths) {
    const content = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(info.default_branch)}`,
      { headers: ghHeaders(token) }
    );
    if (!content.ok) continue;
    const data = await content.json();
    if (data.encoding !== "base64" || !data.content) continue;
    let text = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
    if (text.length > 22000) text = text.slice(0, 22000) + "\n[Tiedosto katkaistu analyysia varten]";
    files.push({ path, content: text });
  }
  return files;
}
function hintInstruction(level, assignment, attemptCount) {
  if (level === 1) return "Anna pieni vihje. Kerro missä tiedostossa tai kohdassa ongelma todennäköisesti on. Älä kirjoita korjattua ratkaisua.";
  if (level === 2) return "Anna tarkempi vihje. Nimeä relevantti ohjelmointikäsite tai rakenne, mutta älä anna valmista opiskelijan ratkaisua.";
  if (level === 3) return "Anna rinnakkainen esimerkki eri nimillä tai arvoilla. Opiskelijan pitää soveltaa sitä omaan ratkaisuunsa.";
  const allowed = Boolean(assignment.allowFullSolution) &&
    attemptCount >= Number(assignment.minAttemptsBeforeFullSolution || 4);
  return allowed
    ? "Malliratkaisu on sallittu vain ongelman olennaiselta osalta. Selitä jokainen olennainen muutos."
    : "Malliratkaisu ei ole sallittu. Anna erittäin tarkka vihje ja rinnakkainen esimerkki.";
}
function buildPrompt({ course, assignment, student, files, message, history, level }) {
  return `Olet Koodiopas, pedagoginen ohjelmoinnin apuagentti.

Opiskelija: ${student.name || student.githubUsername}
Kurssi: ${course.name}
Tehtävä: ${assignment.name}

Tehtävänanto:
${assignment.instructions || "Ei erillistä tehtävänantoa."}

Vihjetaso ${level}:
${hintInstruction(level, assignment, history.length + 1)}

Pedagogiset säännöt:
- auta opiskelijaa ratkaisemaan ongelma itse
- käsittele ensin tärkeintä etenemisen estävää ongelmaa
- kerro tiedosto ja ongelmakohta mahdollisimman täsmällisesti
- selitä mikä on väärin, miksi se on väärin ja mitä opiskelijan kannattaa kokeilla seuraavaksi
- älä väitä suorittaneesi koodia
- älä muuta tehtävän tavoitetta
- älä anna valmista ratkaisua, ellei vihjetaso 4 sitä salli
- vastaa selkeällä suomella

Opiskelijan viesti:
${message || "Tarvitsen apua."}

Aiemmat yritykset:
${history.length
  ? history.slice(-8).map((h, i) => `${i + 1}. Opiskelija: ${h.student}\nKoodiopas: ${h.assistant}`).join("\n\n")
  : "Ei aiempia yrityksiä."}

Repositoryn olennaiset tiedostot:
${files.map(f => `\n===== ${f.path} =====\n${f.content}`).join("\n")}`;
}

/* --------------------------------------------------
   OPETTAJAN SALASANAKIRJAUTUMINEN
-------------------------------------------------- */
app.post("/api/teacher/login", (req, res) => {
  const configured = process.env.TEACHER_PASSWORD;
  const password = String(req.body?.password || "");

  if (!configured || configured === "vaihda_tahan_vahva_salasana") {
    return res.status(503).json({ error: "Määritä TEACHER_PASSWORD .env-tiedostoon." });
  }
  if (password !== configured) {
    return res.status(401).json({ error: "Väärä salasana." });
  }

  req.session.teacher = true;
  res.json({ ok: true });
});
app.post("/api/teacher/logout", (req, res) => {
  req.session.teacher = false;
  delete req.session.teacherGithub;
  res.json({ ok: true });
});
app.get("/api/teacher/session", (req, res) => {
  res.json({ authenticated: req.session?.teacher === true });
});

/* --------------------------------------------------
   YHTEINEN GITHUB OAUTH - VIRTA
   Molemmat roolit käyttävät callbackia:
   /auth/github/callback
-------------------------------------------------- */
app.get("/auth/github/start", (req, res) => {
  const role = String(req.query.role || "");
  if (!["teacher", "student"].includes(role)) {
    return res.status(400).send("Tuntematon GitHub-kirjautumisrooli.");
  }
  if (role === "teacher" && req.session?.teacher !== true) {
    return res.status(401).send("Kirjaudu ensin opettajana Koodioppaaseen.");
  }
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return res.status(503).send("GitHub OAuth -asetukset puuttuvat .env-tiedostosta.");
  }

  const state = base64url(crypto.randomBytes(24));
  const verifier = base64url(crypto.randomBytes(48));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());

  req.session.githubOauth = {
    role,
    state,
    verifier,
    createdAt: Date.now()
  };

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${BASE_URL}/auth/github/callback`,
    scope: "repo read:org",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256"
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

app.get("/auth/github/callback", async (req, res) => {
  try {
    const pending = req.session?.githubOauth;
    if (!pending?.role || !pending?.state || !pending?.verifier) {
      throw new Error("GitHub-kirjautumisen sessiotietoa ei löytynyt.");
    }

    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    if (!code || state !== pending.state) {
      throw new Error("OAuth state -tarkistus epäonnistui.");
    }

    const role = pending.role;
    const verifier = pending.verifier;
    delete req.session.githubOauth;

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${BASE_URL}/auth/github/callback`,
        code_verifier: verifier
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || "GitHub access token -haku epäonnistui.");
    }

    const user = await ghJson("https://api.github.com/user", {
      headers: ghHeaders(tokenData.access_token)
    });

    if (role === "teacher") {
      req.session.teacherGithub = {
        login: user.login,
        accessToken: tokenData.access_token
      };
      return res.redirect("/?github_role=teacher&github_login=ok");
    }

    req.session.studentGithub = {
      login: user.login,
      name: user.name || "",
      avatarUrl: user.avatar_url || "",
      accessToken: tokenData.access_token
    };
    res.redirect("/?github_role=student&github_login=ok");
  } catch (error) {
    res.redirect(`/?github_login=error&message=${encodeURIComponent(error.message)}`);
  }
});

/* yhteensopivuus vanhojen nappien kanssa */
app.get("/auth/github/teacher", requireTeacher, (req, res) => {
  res.redirect("/auth/github/start?role=teacher");
});
app.get("/auth/github/student", (req, res) => {
  res.redirect("/auth/github/start?role=student");
});

app.post("/api/teacher/github/disconnect", requireTeacher, (req, res) => {
  delete req.session.teacherGithub;
  res.json({ ok: true });
});
app.get("/api/teacher/github/session", requireTeacher, (req, res) => {
  res.json({
    connected: Boolean(req.session?.teacherGithub?.accessToken),
    login: req.session?.teacherGithub?.login || "",
    githubOrg: settings().githubOrg || ""
  });
});
app.post("/api/student/logout", (req, res) => {
  delete req.session.studentGithub;
  res.json({ ok: true });
});
app.get("/api/student/session", (req, res) => {
  const user = req.session?.studentGithub;
  if (!user) return res.json({ authenticated: false });

  const ws = studentWorkspace(user.login);
  res.json({
    authenticated: true,
    githubUser: {
      login: user.login,
      name: user.name,
      avatarUrl: user.avatarUrl
    },
    matched: ws.matched,
    student: ws.student || null,
    group: ws.group || null
  });
});
app.get("/api/student/workspace", requireStudent, (req, res) => {
  res.json(studentWorkspace(req.session.studentGithub.login));
});


app.get("/api/student/repository-status", requireStudent, async (req, res) => {
  try {
    const courseId = String(req.query.courseId || "");
    const assignmentId = String(req.query.assignmentId || "");
    const ws = studentWorkspace(req.session.studentGithub.login);

    if (!ws.matched) {
      return res.status(403).json({ error: "GitHub-tunnustasi ei ole liitetty opiskelijaan." });
    }

    const course = ws.courses.find(c => c.id === courseId);
    const assignment = course?.assignments.find(a => a.id === assignmentId);
    if (!course || !assignment) {
      return res.status(404).json({ error: "Kurssia tai tehtävää ei löytynyt." });
    }
    if (!assignment.repoUrl) {
      return res.status(400).json({ error: "Tehtävälle ei ole muodostettu repository-osoitetta." });
    }

    const status = await studentRepositoryStatus(
      assignment.repoUrl,
      req.session.studentGithub.accessToken
    );

    res.json({
      course: { id: course.id, name: course.name },
      assignment: { id: assignment.id, name: assignment.name },
      repoUrl: assignment.repoUrl,
      ...status
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Repositoryn tilan tarkistus epäonnistui." });
  }
});


app.get("/api/student/workflow-status", requireStudent, async (req, res) => {
  try {
    const courseId = String(req.query.courseId || "");
    const assignmentId = String(req.query.assignmentId || "");
    const ws = studentWorkspace(req.session.studentGithub.login);

    if (!ws.matched) return res.status(403).json({ error: "GitHub-tunnustasi ei ole liitetty opiskelijaan." });

    const course = ws.courses.find(c => c.id === courseId);
    const assignment = course?.assignments.find(a => a.id === assignmentId);
    if (!course || !assignment) return res.status(404).json({ error: "Kurssia tai tehtävää ei löytynyt." });

    const repoStatus = await studentRepositoryStatus(assignment.repoUrl, req.session.studentGithub.accessToken);
    const submission = latestSubmission(ws.student.id, courseId, assignmentId);

    const newerCommitAfterSubmission = Boolean(
      submission?.commitSha &&
      repoStatus?.latestCommit?.sha &&
      submission.commitSha !== repoStatus.latestCommit.sha
    );

    res.json({
      repository: repoStatus,
      submission,
      newerCommitAfterSubmission,
      recommendedCommands: repoStatus.status === "ready" ? [
        `git clone ${repoStatus.cloneUrl}`,
        "git status",
        "git add .",
        'git commit -m "Kuvaava commit-viesti"',
        "git push"
      ] : []
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Työtilan tilan tarkistus epäonnistui." });
  }
});

/* --------------------------------------------------
   HALLINTA
-------------------------------------------------- */
app.get("/api/groups", requireTeacher, (req, res) => {
  res.json(readJson(FILES.groups, { groups: [] }));
});
app.put("/api/groups", requireTeacher, (req, res) => {
  const groups = Array.isArray(req.body?.groups) ? req.body.groups : [];
  writeJson(FILES.groups, { groups });
  res.json({ ok: true, groups });
});
app.get("/api/courses", requireTeacher, (req, res) => {
  res.json(readJson(FILES.courses, { courses: [] }));
});
app.put("/api/courses", requireTeacher, (req, res) => {
  const courses = Array.isArray(req.body?.courses) ? req.body.courses : [];
  writeJson(FILES.courses, { courses });
  res.json({ ok: true, courses });
});
app.get("/api/settings", requireTeacher, (req, res) => {
  res.json(settings());
});
app.put("/api/settings", requireTeacher, (req, res) => {
  const current = settings();
  const value = {
    ...current,
    githubOrg: String(req.body?.githubOrg || "").trim().replace(/^@/, ""),
    defaultRepoPrivate: Boolean(req.body?.defaultRepoPrivate)
  };
  writeJson(FILES.settings, value);
  res.json({ ok: true, settings: value });
});

/* --------------------------------------------------
   TEHTÄVÄN JAKO
-------------------------------------------------- */
app.post("/api/distribute/preview", requireTeacher, (req, res) => {
  try {
    const { courseId, assignmentId, groupId } = req.body || {};
    const { course, assignment } = findCourseAssignment(courseId, assignmentId);
    const group = findGroup(groupId);
    const cfg = settings();

    if (!course || !assignment || !group) {
      return res.status(404).json({ error: "Kurssia, tehtävää tai ryhmää ei löytynyt." });
    }
    if (!assignment.templateRepoUrl) {
      return res.status(400).json({ error: "Tehtävältä puuttuu Template repository." });
    }
    parseGithubRepoUrl(assignment.templateRepoUrl);
    if (!cfg.githubOrg) {
      return res.status(400).json({ error: "Aseta ensin GitHub-organisaatio." });
    }

    const rows = (group.students || []).map(student => ({
      studentId: student.id,
      studentName: student.name,
      githubUsername: student.githubUsername || "",
      repoName: expectedRepoName(assignment, student),
      repoUrl: expectedRepoUrl(assignment, student),
      valid: Boolean(student.githubUsername)
    }));

    res.json({
      course: { id: course.id, name: course.name },
      assignment: {
        id: assignment.id,
        name: assignment.name,
        templateRepoUrl: assignment.templateRepoUrl
      },
      group: { id: group.id, name: group.name },
      private: assignment.privateRepo ?? cfg.defaultRepoPrivate,
      rows
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/distribute/run", requireTeacher, async (req, res) => {
  try {
    if (!req.session?.teacherGithub?.accessToken) {
      return res.status(401).json({ error: "Yhdistä ensin opettajan GitHub-tili." });
    }

    const { courseId, assignmentId, groupId } = req.body || {};
    const { course, assignment } = findCourseAssignment(courseId, assignmentId);
    const group = findGroup(groupId);
    const cfg = settings();

    if (!course || !assignment || !group) {
      return res.status(404).json({ error: "Kurssia, tehtävää tai ryhmää ei löytynyt." });
    }
    if (!cfg.githubOrg) {
      return res.status(400).json({ error: "GitHub-organisaatio puuttuu." });
    }

    const { owner: templateOwner, repo: templateRepo } = parseGithubRepoUrl(assignment.templateRepoUrl);
    const token = req.session.teacherGithub.accessToken;
    const isPrivate = assignment.privateRepo ?? cfg.defaultRepoPrivate;

    const templateInfo = await ghJson(
      `https://api.github.com/repos/${encodeURIComponent(templateOwner)}/${encodeURIComponent(templateRepo)}`,
      { headers: ghHeaders(token) }
    );
    if (!templateInfo.is_template) {
      return res.status(400).json({ error: "Valittu repository ei ole merkitty GitHubissa Template repositoryksi." });
    }

    const results = [];
    for (const student of group.students || []) {
      if (!student.githubUsername) {
        results.push({
          student: student.name || student.id,
          status: "skipped",
          error: "GitHub-käyttäjänimi puuttuu"
        });
        continue;
      }

      const repoName = expectedRepoName(assignment, student);
      const repoUrl = `https://github.com/${cfg.githubOrg}/${repoName}`;

      try {
        const exists = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(cfg.githubOrg)}/${encodeURIComponent(repoName)}`,
          { headers: ghHeaders(token) }
        );

        if (exists.ok) {
          results.push({
            student: student.name || student.id,
            githubUsername: student.githubUsername,
            repoName,
            repoUrl,
            status: "exists"
          });
          continue;
        }

        await ghJson(
          `https://api.github.com/repos/${encodeURIComponent(templateOwner)}/${encodeURIComponent(templateRepo)}/generate`,
          {
            method: "POST",
            headers: { ...ghHeaders(token), "Content-Type": "application/json" },
            body: JSON.stringify({
              owner: cfg.githubOrg,
              name: repoName,
              description: `${course.name} – ${assignment.name} – ${student.name || student.id}`,
              private: isPrivate,
              include_all_branches: false
            })
          }
        );

        const collaborator = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(cfg.githubOrg)}/${encodeURIComponent(repoName)}/collaborators/${encodeURIComponent(student.githubUsername)}`,
          {
            method: "PUT",
            headers: { ...ghHeaders(token), "Content-Type": "application/json" },
            body: JSON.stringify({ permission: "push" })
          }
        );

        if (!collaborator.ok) {
          let details = {};
          try { details = await collaborator.json(); } catch {}
          results.push({
            student: student.name || student.id,
            githubUsername: student.githubUsername,
            repoName,
            repoUrl,
            status: "created_invite_failed",
            error: details.message || `Collaborator API ${collaborator.status}`
          });
        } else {
          results.push({
            student: student.name || student.id,
            githubUsername: student.githubUsername,
            repoName,
            repoUrl,
            status: "created"
          });
        }
      } catch (error) {
        results.push({
          student: student.name || student.id,
          githubUsername: student.githubUsername,
          repoName,
          repoUrl,
          status: "failed",
          error: error.message
        });
      }
    }

    const log = readJson(FILES.distributions, { distributions: [] });
    log.distributions.push({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      teacherGithub: req.session.teacherGithub.login,
      organization: cfg.githubOrg,
      courseId,
      courseName: course.name,
      assignmentId,
      assignmentName: assignment.name,
      groupId,
      groupName: group.name,
      results
    });
    writeJson(FILES.distributions, log);

    res.json({ ok: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* --------------------------------------------------
   OPISKELIJAN KOODIANALYYSI
-------------------------------------------------- */
app.post("/api/student/analyze", requireStudent, async (req, res) => {
  try {
    const { courseId, assignmentId, message = "", requestedLevel = 1, history = [] } = req.body || {};
    const ws = studentWorkspace(req.session.studentGithub.login);

    if (!ws.matched) {
      return res.status(403).json({ error: "GitHub-tunnustasi ei ole liitetty opiskelijaan." });
    }

    const course = ws.courses.find(c => c.id === courseId);
    const assignment = course?.assignments.find(a => a.id === assignmentId);
    if (!course || !assignment) {
      return res.status(404).json({ error: "Kurssia tai tehtävää ei löytynyt." });
    }

    const level = Math.max(
      1,
      Math.min(Number(assignment.maxHintLevel || 3), Number(requestedLevel) || 1)
    );

    appendAnalytics({
      githubUsername: ws.student.githubUsername,
      studentId: ws.student.id,
      studentName: ws.student.name,
      groupId: ws.group.id,
      groupName: ws.group.name,
      courseId: course.id,
      courseName: course.name,
      assignmentId: assignment.id,
      assignmentName: assignment.name,
      repoUrl: assignment.repoUrl,
      level,
      message: String(message).slice(0, 500)
    });

    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL) {
      return res.status(503).json({
        demo: true,
        error: "GitHub-kirjautuminen, työtila ja analytiikka toimivat. Tekoälyvihjeitä varten määritä OPENAI_API_KEY ja OPENAI_MODEL .env-tiedostoon.",
        level
      });
    }

    const files = await fetchRepoFiles(
      assignment.repoUrl,
      req.session.studentGithub.accessToken
    );

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL,
      input: buildPrompt({
        course,
        assignment,
        student: ws.student,
        files,
        message,
        history,
        level
      }),
      store: false
    });

    res.json({
      answer: response.output_text || "",
      level,
      maxHintLevel: Number(assignment.maxHintLevel || 3),
      files: files.map(f => f.path)
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Analyysi epäonnistui." });
  }
});


function submissionKey(studentId, courseId, assignmentId) {
  return `${studentId}::${courseId}::${assignmentId}`;
}
function latestSubmission(studentId, courseId, assignmentId) {
  const data = readJson(FILES.submissions, { submissions: [] }).submissions || [];
  const key = submissionKey(studentId, courseId, assignmentId);
  return data
    .filter(item => submissionKey(item.studentId, item.courseId, item.assignmentId) === key)
    .sort((a, b) => new Date(b.updatedAt || b.submittedAt) - new Date(a.updatedAt || a.submittedAt))[0] || null;
}

app.get("/api/student/submission-status", requireStudent, (req, res) => {
  const courseId = String(req.query.courseId || "");
  const assignmentId = String(req.query.assignmentId || "");
  const ws = studentWorkspace(req.session.studentGithub.login);

  if (!ws.matched) {
    return res.status(403).json({ error: "GitHub-tunnustasi ei ole liitetty opiskelijaan." });
  }

  const course = ws.courses.find(c => c.id === courseId);
  const assignment = course?.assignments.find(a => a.id === assignmentId);
  if (!course || !assignment) {
    return res.status(404).json({ error: "Kurssia tai tehtävää ei löytynyt." });
  }

  res.json({
    submission: latestSubmission(ws.student.id, courseId, assignmentId)
  });
});

app.post("/api/student/submit", requireStudent, async (req, res) => {
  try {
    const { courseId, assignmentId, message = "" } = req.body || {};
    const ws = studentWorkspace(req.session.studentGithub.login);

    if (!ws.matched) {
      return res.status(403).json({ error: "GitHub-tunnustasi ei ole liitetty opiskelijaan." });
    }

    const course = ws.courses.find(c => c.id === courseId);
    const assignment = course?.assignments.find(a => a.id === assignmentId);
    if (!course || !assignment) {
      return res.status(404).json({ error: "Kurssia tai tehtävää ei löytynyt." });
    }

    const repoStatus = await studentRepositoryStatus(
      assignment.repoUrl,
      req.session.studentGithub.accessToken
    );

    if (repoStatus.status !== "ready" || !repoStatus.latestCommit?.sha) {
      return res.status(400).json({
        error: "Tehtävää ei voi palauttaa vielä. Repositoryn pitää olla käyttövalmis ja siinä pitää olla vähintään yksi commit."
      });
    }

    const data = readJson(FILES.submissions, { submissions: [] });
    const previous = latestSubmission(ws.student.id, courseId, assignmentId);

    const submission = {
      id: crypto.randomUUID(),
      studentId: ws.student.id,
      studentName: ws.student.name,
      githubUsername: ws.student.githubUsername,
      groupId: ws.group.id,
      groupName: ws.group.name,
      courseId,
      courseName: course.name,
      assignmentId,
      assignmentName: assignment.name,
      repoUrl: assignment.repoUrl,
      commitSha: repoStatus.latestCommit.sha,
      commitShortSha: repoStatus.latestCommit.shortSha,
      commitMessage: repoStatus.latestCommit.message,
      studentMessage: String(message || "").slice(0, 1500),
      status: "submitted",
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      teacherFeedback: "",
      reviewedAt: null,
      previousSubmissionId: previous?.id || null
    };

    data.submissions.push(submission);
    writeJson(FILES.submissions, data);

    res.json({ ok: true, submission });
  } catch (error) {
    res.status(500).json({ error: error.message || "Tehtävän palautus epäonnistui." });
  }
});


app.get("/api/teacher/submissions", requireTeacher, async (req, res) => {
  const data = readJson(FILES.submissions, { submissions: [] }).submissions || [];
  const latest = new Map();

  for (const item of data) {
    const key = submissionKey(item.studentId, item.courseId, item.assignmentId);
    const old = latest.get(key);
    if (!old || new Date(item.updatedAt || item.submittedAt) > new Date(old.updatedAt || old.submittedAt)) {
      latest.set(key, item);
    }
  }

  const items = [...latest.values()].sort((a, b) =>
    new Date(b.updatedAt || b.submittedAt) - new Date(a.updatedAt || a.submittedAt)
  );

  if (req.session?.teacherGithub?.accessToken) {
    for (const item of items) {
      try {
        const { owner, repo } = parseGithubRepoUrl(item.repoUrl);
        const response = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=1`,
          { headers: ghHeaders(req.session.teacherGithub.accessToken) }
        );
        if (response.ok) {
          const commits = await response.json();
          if (Array.isArray(commits) && commits[0]) {
            item.currentLatestCommit = {
              sha: commits[0].sha,
              shortSha: String(commits[0].sha || "").slice(0, 7),
              message: commits[0].commit?.message || "",
              date: commits[0].commit?.author?.date || ""
            };
            item.newerCommitAfterSubmission = Boolean(item.commitSha) && item.commitSha !== commits[0].sha;
          }
        }
      } catch {}
    }
  }

  res.json({
    submissions: items,
    counts: {
      submitted: items.filter(x => x.status === "submitted").length,
      changesRequested: items.filter(x => x.status === "changes_requested").length,
      approved: items.filter(x => x.status === "approved").length
    }
  });
});

app.post("/api/teacher/submissions/:id/review", requireTeacher, (req, res) => {
  const id = String(req.params.id || "");
  const status = String(req.body?.status || "");
  const feedback = String(req.body?.feedback || "").slice(0, 3000);
  const assessment = req.body?.assessment || null;

  if (!["approved", "changes_requested"].includes(status)) {
    return res.status(400).json({ error: "Tuntematon arviointitila." });
  }

  const data = readJson(FILES.submissions, { submissions: [] });
  const item = data.submissions.find(x => x.id === id);
  if (!item) {
    return res.status(404).json({ error: "Palautusta ei löytynyt." });
  }

  item.status = status;
  item.teacherFeedback = feedback;
  if (assessment && Array.isArray(assessment.scores)) {
    const rubric = rubricForAssignment(item.courseId,item.assignmentId);
    const scores = rubric.criteria.map(c => {
      const v=assessment.scores.find(x=>x.id===c.id);
      return {id:c.id,name:c.name,maxPoints:c.maxPoints,
        points:Math.max(0,Math.min(c.maxPoints,Number(v?.points)||0))};
    });
    const totalPoints=scores.reduce((a,x)=>a+x.points,0);
    const maxPoints=scores.reduce((a,x)=>a+x.maxPoints,0);
    const percent=maxPoints?Math.round(totalPoints/maxPoints*100):0;
    item.assessment={scores,totalPoints,maxPoints,percent,grade:gradeFromPercent(percent,rubric.gradeBoundaries),gradeBoundaries:rubric.gradeBoundaries||[]};
  }
  item.reviewedAt = new Date().toISOString();
  item.updatedAt = new Date().toISOString();

  writeJson(FILES.submissions, data);
  res.json({ ok: true, submission: item });
});


/* ARVIOINTIRUBRIIKIT */
function defaultRubric() {
  return {
    criteria: [
      { id:"structure", name:"Rakenne ja toimivuus", maxPoints:5 },
      { id:"quality", name:"Koodin laatu ja luettavuus", maxPoints:5 },
      { id:"requirements", name:"Tehtävänannon vaatimukset", maxPoints:5 },
      { id:"finish", name:"Ongelmanratkaisu ja viimeistely", maxPoints:5 }
    ],
    gradeBoundaries: [
      { grade:"Hylätty", minPercent:0 },
      { grade:"1", minPercent:50 },
      { grade:"2", minPercent:60 },
      { grade:"3", minPercent:70 },
      { grade:"4", minPercent:80 },
      { grade:"5", minPercent:90 }
    ]
  };
}
function rubricForAssignment(courseId, assignmentId) {
  const d=readJson(FILES.rubrics,{rubrics:[]});
  return d.rubrics.find(r=>r.courseId===courseId&&r.assignmentId===assignmentId) ||
    {courseId,assignmentId,...defaultRubric()};
}
app.get("/api/teacher/submissions/:id/rubric", requireTeacher, (req,res)=>{
  const d=readJson(FILES.submissions,{submissions:[]});
  const item=d.submissions.find(x=>x.id===String(req.params.id||""));
  if(!item) return res.status(404).json({error:"Palautusta ei löytynyt."});
  res.json({rubric:rubricForAssignment(item.courseId,item.assignmentId),assessment:item.assessment||null});
});

app.get("/api/teacher/rubric", requireTeacher, (req,res)=>{
  const courseId=String(req.query.courseId||"");
  const assignmentId=String(req.query.assignmentId||"");
  res.json({rubric:rubricForAssignment(courseId,assignmentId)});
});

app.put("/api/teacher/rubric", requireTeacher, (req,res)=>{
  const {courseId,assignmentId,criteria,gradeBoundaries}=req.body||{};
  if(!courseId||!assignmentId) return res.status(400).json({error:"Kurssi tai tehtävä puuttuu."});
  if(!Array.isArray(criteria)||!criteria.length) return res.status(400).json({error:"Lisää vähintään yksi arviointikriteeri."});
  const cleanedCriteria=criteria.slice(0,12).map((c,i)=>({
    id:String(c.id||`criterion-${i+1}`),
    name:String(c.name||`Kriteeri ${i+1}`).slice(0,120),
    maxPoints:Math.max(1,Math.min(100,Number(c.maxPoints)||1))
  }));
  const grades=(Array.isArray(gradeBoundaries)&&gradeBoundaries.length?gradeBoundaries:defaultRubric().gradeBoundaries)
    .slice(0,10).map(g=>({grade:String(g.grade||"").slice(0,30),minPercent:Math.max(0,Math.min(100,Number(g.minPercent)||0))}))
    .sort((a,b)=>a.minPercent-b.minPercent);
  const data=readJson(FILES.rubrics,{rubrics:[]});
  const rubric={courseId:String(courseId),assignmentId:String(assignmentId),criteria:cleanedCriteria,gradeBoundaries:grades,updatedAt:new Date().toISOString()};
  const idx=data.rubrics.findIndex(r=>r.courseId===rubric.courseId&&r.assignmentId===rubric.assignmentId);
  if(idx>=0)data.rubrics[idx]=rubric;else data.rubrics.push(rubric);
  writeJson(FILES.rubrics,data);
  res.json({ok:true,rubric});
});

function gradeFromPercent(percent,boundaries){
  const sorted=[...(boundaries||[])].sort((a,b)=>a.minPercent-b.minPercent);
  let grade=sorted[0]?.grade||"";
  for(const item of sorted) if(percent>=item.minPercent) grade=item.grade;
  return grade;
}

app.post("/api/teacher/submissions/:id/suggest-assessment", requireTeacher, async (req,res)=>{
  try{
    if(!process.env.OPENAI_API_KEY||!process.env.OPENAI_MODEL) return res.status(503).json({error:"Määritä OPENAI_API_KEY ja OPENAI_MODEL .env-tiedostoon."});
    if(!req.session?.teacherGithub?.accessToken) return res.status(401).json({error:"Yhdistä opettajan GitHub-tili ensin."});
    const data=readJson(FILES.submissions,{submissions:[]});
    const item=data.submissions.find(x=>x.id===String(req.params.id||""));
    if(!item) return res.status(404).json({error:"Palautusta ei löytynyt."});
    const rubric=rubricForAssignment(item.courseId,item.assignmentId);
    const files=await fetchRepoFiles(item.repoUrl,req.session.teacherGithub.accessToken);
    const {course,assignment}=findCourseAssignment(item.courseId,item.assignmentId);
    const rubricText=(rubric.criteria||[]).map(c=>`- ${c.id}: ${c.name}, max ${c.maxPoints} p`).join("\n");
    const fileText=files.map(f=>`\n===== ${f.path} =====\n${f.content}`).join("\n");
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const response=await client.responses.create({model:process.env.OPENAI_MODEL,input:`Olet opettajan arviointiapuri. Tee vain alustava arviointiehdotus, jonka opettaja tarkistaa.
Kurssi: ${course?.name||item.courseName}
Tehtävä: ${assignment?.name||item.assignmentName}
Tehtävänanto: ${assignment?.instructions||""}
Rubriikki:
${rubricText}
Palauta VAIN JSON muodossa:
{"scores":[{"id":"criterion","points":0,"reason":"..."}],"feedback":"lyhyt yhteenveto"}
Koodi:
${fileText}`,store:false});
    let parsed;
    try{parsed=JSON.parse((response.output_text||"").replace(/^```json\s*/i,"").replace(/```\s*$/,"").trim());}
    catch{return res.status(502).json({error:"Arviointiehdotusta ei saatu JSON-muodossa."});}
    const scores=(rubric.criteria||[]).map(c=>{const p=(parsed.scores||[]).find(s=>s.id===c.id);return {id:c.id,name:c.name,maxPoints:c.maxPoints,points:Math.max(0,Math.min(c.maxPoints,Number(p?.points)||0)),reason:String(p?.reason||"").slice(0,500)};});
    res.json({suggestion:{scores,feedback:String(parsed.feedback||"").slice(0,2000)}});
  }catch(error){res.status(500).json({error:error.message||"Arviointiehdotus epäonnistui."});}
});


/* OPISKELIJAN EDISTYMINEN */
app.get("/api/student/progress", requireStudent, (req,res)=>{
  const ws=studentWorkspace(req.session.studentGithub.login);
  if(!ws.matched) return res.status(403).json({error:"GitHub-tunnustasi ei ole liitetty opiskelijaan."});

  const submissions=readJson(FILES.submissions,{submissions:[]}).submissions||[];
  const rows=[];
  for(const course of ws.courses||[]){
    for(const assignment of course.assignments||[]){
      const history=submissions
        .filter(x=>x.studentId===ws.student.id && x.courseId===course.id && x.assignmentId===assignment.id)
        .sort((a,b)=>new Date(b.updatedAt||b.submittedAt)-new Date(a.updatedAt||a.submittedAt));
      const latest=history[0]||null;
      rows.push({
        courseId:course.id,courseName:course.name,
        assignmentId:assignment.id,assignmentName:assignment.name,
        status:latest?.status||"not_submitted",
        assessment:latest?.assessment||null,
        submittedAt:latest?.submittedAt||null,
        reviewedAt:latest?.reviewedAt||null,
        attempts:history.length
      });
    }
  }
  const approved=rows.filter(x=>x.status==="approved").length;
  const pending=rows.filter(x=>x.status==="submitted").length;
  const changes=rows.filter(x=>x.status==="changes_requested").length;
  const graded=rows.filter(x=>x.assessment?.percent!=null);
  const average=graded.length?Math.round(graded.reduce((a,x)=>a+x.assessment.percent,0)/graded.length):null;
  res.json({rows,summary:{total:rows.length,approved,pending,changes,average}});
});


/* OPETTAJAN DASHBOARD */
app.get("/api/teacher/dashboard", requireTeacher, (req,res)=>{
  const groups=readJson(FILES.groups,{groups:[]}).groups||[];
  const courses=readJson(FILES.courses,{courses:[]}).courses||[];
  const submissions=readJson(FILES.submissions,{submissions:[]}).submissions||[];
  const analytics=readJson(FILES.analytics,{events:[]}).events||[];
  const students=[];

  for(const group of groups){
    for(const student of group.students||[]){
      const sc=courses.filter(c=>(c.groupIds||[]).includes(group.id));
      const assignments=sc.flatMap(c=>(c.assignments||[]).map(a=>({course:c,assignment:a})));
      let approved=0,pending=0,changes=0,notSubmitted=0;
      const percents=[];

      for(const pair of assignments){
        const history=submissions
          .filter(x=>x.studentId===student.id && x.courseId===pair.course.id && x.assignmentId===pair.assignment.id)
          .sort((a,b)=>new Date(b.updatedAt||b.submittedAt)-new Date(a.updatedAt||a.submittedAt));
        const latest=history[0]||null;
        if(!latest) notSubmitted++;
        else if(latest.status==="approved") approved++;
        else if(latest.status==="submitted") pending++;
        else if(latest.status==="changes_requested") changes++;
        if(latest?.assessment?.percent!=null) percents.push(latest.assessment.percent);
      }

      const help=analytics.filter(e=>e.studentId===student.id);
      const highHelp=help.filter(e=>Number(e.level)>=3).length;
      const average=percents.length?Math.round(percents.reduce((a,b)=>a+b,0)/percents.length):null;
      const total=assignments.length;
      const completion=total?Math.round(approved/total*100):0;
      const attention=changes>0 || highHelp>=3 || (total>=2 && notSubmitted>=Math.ceil(total/2)) || (average!=null && average<60);

      students.push({
        studentId:student.id,studentName:student.name,githubUsername:student.githubUsername,
        groupId:group.id,groupName:group.name,total,approved,pending,changes,notSubmitted,
        completion,average,helpRequests:help.length,highHelp,attention
      });
    }
  }

  const groupRows=groups.map(group=>{
    const rows=students.filter(x=>x.groupId===group.id);
    const totalAssignments=rows.reduce((a,x)=>a+x.total,0);
    const totalApproved=rows.reduce((a,x)=>a+x.approved,0);
    const avgs=rows.filter(x=>x.average!=null).map(x=>x.average);
    return {
      groupId:group.id,groupName:group.name,students:rows.length,
      completion:totalAssignments?Math.round(totalApproved/totalAssignments*100):0,
      average:avgs.length?Math.round(avgs.reduce((a,b)=>a+b,0)/avgs.length):null,
      attention:rows.filter(x=>x.attention).length
    };
  });

  res.json({
    summary:{
      students:students.length,
      attention:students.filter(x=>x.attention).length,
      pending:students.reduce((a,x)=>a+x.pending,0),
      changes:students.reduce((a,x)=>a+x.changes,0)
    },
    groups:groupRows,
    students:students.sort((a,b)=>Number(b.attention)-Number(a.attention)||a.completion-b.completion||String(a.studentName).localeCompare(String(b.studentName)))
  });
});


/* KURSSIN VIENTI / TUONTI */
app.get("/api/teacher/course-export/:courseId", requireTeacher, (req,res)=>{
  const courseId=String(req.params.courseId||"");
  const courses=readJson(FILES.courses,{courses:[]}).courses||[];
  const rubrics=readJson(FILES.rubrics,{rubrics:[]}).rubrics||[];
  const course=courses.find(c=>c.id===courseId);
  if(!course) return res.status(404).json({error:"Kurssia ei löytynyt."});

  const payload={
    format:"koodiopas-course",
    version:1,
    exportedAt:new Date().toISOString(),
    course:{
      id:course.id,
      name:course.name,
      assignments:course.assignments||[]
    },
    rubrics:rubrics.filter(r=>r.courseId===courseId)
  };

  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Content-Disposition",`attachment; filename="${slug(course.name||"kurssi")}.koodiopas.json"`);
  res.send(JSON.stringify(payload,null,2));
});

app.post("/api/teacher/course-import", requireTeacher, (req,res)=>{
  const payload=req.body;
  if(!payload || payload.format!=="koodiopas-course" || !payload.course) {
    return res.status(400).json({error:"Tiedosto ei ole Koodiopas-kurssipaketti."});
  }

  const coursesData=readJson(FILES.courses,{courses:[]});
  const rubricsData=readJson(FILES.rubrics,{rubrics:[]});

  const newCourseId=crypto.randomUUID();
  const assignmentIdMap=new Map();
  const importedAssignments=(payload.course.assignments||[]).map(a=>{
    const newId=crypto.randomUUID();
    assignmentIdMap.set(a.id,newId);
    return {
      ...a,
      id:newId
    };
  });

  const newCourse={
    id:newCourseId,
    name:`${payload.course.name||"Tuotu kurssi"} (tuotu)`,
    groupIds:[],
    assignments:importedAssignments
  };
  coursesData.courses.push(newCourse);

  for(const rubric of payload.rubrics||[]) {
    const mappedId=assignmentIdMap.get(rubric.assignmentId);
    if(!mappedId) continue;
    rubricsData.rubrics.push({
      ...rubric,
      courseId:newCourseId,
      assignmentId:mappedId,
      updatedAt:new Date().toISOString()
    });
  }

  writeJson(FILES.courses,coursesData);
  writeJson(FILES.rubrics,rubricsData);

  res.json({
    ok:true,
    course:newCourse,
    importedAssignments:importedAssignments.length,
    importedRubrics:(payload.rubrics||[]).filter(r=>assignmentIdMap.has(r.assignmentId)).length
  });
});


/* KOKO DATAN VARMUUSKOPIOINTI / PALAUTUS */
function fullBackupPayload() {
  return {
    format:"koodiopas-backup",
    version:1,
    createdAt:new Date().toISOString(),
    appVersion:"27.0.0",
    data:{
      groups:readJson(FILES.groups,{groups:[]}),
      courses:readJson(FILES.courses,{courses:[]}),
      distributions:readJson(FILES.distributions,{distributions:[]}),
      analytics:readJson(FILES.analytics,{events:[]}),
      submissions:readJson(FILES.submissions,{submissions:[]}),
      rubrics:readJson(FILES.rubrics,{rubrics:[]}),
      settings:readJson(FILES.settings,{})
    }
  };
}

function safeTimestamp() {
  return new Date().toISOString().replace(/[:.]/g,"-");
}

function writeSnapshotBackup() {
  const dir=path.join(DATA_DIR,"backups");
  if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,`before-restore-${safeTimestamp()}.json`);
  fs.writeFileSync(file,JSON.stringify(fullBackupPayload(),null,2),"utf8");
  return file;
}

app.get("/api/teacher/full-backup", requireTeacher, (req,res)=>{
  const payload=fullBackupPayload();
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Content-Disposition",`attachment; filename="koodiopas-backup-${safeTimestamp()}.json"`);
  res.send(JSON.stringify(payload,null,2));
});

app.post("/api/teacher/full-restore/preview", requireTeacher, (req,res)=>{
  const payload=req.body;
  if(!payload || payload.format!=="koodiopas-backup" || !payload.data) {
    return res.status(400).json({error:"Tiedosto ei ole Koodiopas-varmuuskopio."});
  }

  const summary={
    groups:Array.isArray(payload.data.groups?.groups)?payload.data.groups.groups.length:0,
    students:Array.isArray(payload.data.groups?.groups)
      ? payload.data.groups.groups.reduce((sum,g)=>sum+(Array.isArray(g.students)?g.students.length:0),0):0,
    courses:Array.isArray(payload.data.courses?.courses)?payload.data.courses.courses.length:0,
    assignments:Array.isArray(payload.data.courses?.courses)
      ? payload.data.courses.courses.reduce((sum,c)=>sum+(Array.isArray(c.assignments)?c.assignments.length:0),0):0,
    submissions:Array.isArray(payload.data.submissions?.submissions)?payload.data.submissions.submissions.length:0,
    rubrics:Array.isArray(payload.data.rubrics?.rubrics)?payload.data.rubrics.rubrics.length:0,
    analytics:Array.isArray(payload.data.analytics?.events)?payload.data.analytics.events.length:0
  };

  res.json({
    ok:true,
    createdAt:payload.createdAt||null,
    appVersion:payload.appVersion||"",
    summary
  });
});

app.post("/api/teacher/full-restore", requireTeacher, (req,res)=>{
  const payload=req.body;
  if(!payload || payload.format!=="koodiopas-backup" || !payload.data) {
    return res.status(400).json({error:"Tiedosto ei ole Koodiopas-varmuuskopio."});
  }

  const d=payload.data;
  const required=[
    ["groups",d.groups],["courses",d.courses],["distributions",d.distributions],
    ["analytics",d.analytics],["submissions",d.submissions],["rubrics",d.rubrics],["settings",d.settings]
  ];
  for(const [name,value] of required) {
    if(!value || typeof value!=="object") {
      return res.status(400).json({error:`Varmuuskopiosta puuttuu osio: ${name}`});
    }
  }

  const safetyBackup=writeSnapshotBackup();

  writeJson(FILES.groups,d.groups);
  writeJson(FILES.courses,d.courses);
  writeJson(FILES.distributions,d.distributions);
  writeJson(FILES.analytics,d.analytics);
  writeJson(FILES.submissions,d.submissions);
  writeJson(FILES.rubrics,d.rubrics);
  writeJson(FILES.settings,d.settings);

  const migration=migrateData();

  res.json({
    ok:true,
    safetyBackup,
    migration
  });
});

/* --------------------------------------------------
   OPETTAJAN SEURANTA
-------------------------------------------------- */

app.post("/api/teacher/repository-status", requireTeacher, async (req, res) => {
  try {
    if (!req.session?.teacherGithub?.accessToken) {
      return res.status(401).json({ error: "Yhdistä ensin opettajan GitHub-tili." });
    }

    const urls = Array.isArray(req.body?.urls) ? req.body.urls.slice(0, 100) : [];
    const token = req.session.teacherGithub.accessToken;
    const results = [];

    for (const url of urls) {
      try {
        const { owner, repo } = parseGithubRepoUrl(url);
        const response = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
          { headers: ghHeaders(token) }
        );

        if (!response.ok) {
          results.push({ url, exists: false, status: response.status });
          continue;
        }

        const info = await response.json();
        const commitsResponse = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=1`,
          { headers: ghHeaders(token) }
        );

        let latestCommit = null;
        if (commitsResponse.ok) {
          const commits = await commitsResponse.json();
          if (Array.isArray(commits) && commits[0]) {
            latestCommit = {
              shortSha: String(commits[0].sha || "").slice(0, 7),
              message: commits[0].commit?.message || "",
              author: commits[0].commit?.author?.name || commits[0].author?.login || "",
              date: commits[0].commit?.author?.date || ""
            };
          }
        }

        results.push({
          url,
          exists: true,
          private: Boolean(info.private),
          defaultBranch: info.default_branch || "",
          updatedAt: info.updated_at || "",
          latestCommit
        });
      } catch (error) {
        results.push({ url, exists: false, error: error.message });
      }
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message || "Repositoryjen tarkistus epäonnistui." });
  }
});

app.get("/api/teacher/distributions", requireTeacher, (req, res) => {
  res.json(readJson(FILES.distributions, { distributions: [] }));
});
app.get("/api/teacher/analytics", requireTeacher, (req, res) => {
  const events = readJson(FILES.analytics, { events: [] }).events || [];
  const students = new Map();

  for (const event of events) {
    const key = event.studentId || event.githubUsername;
    if (!students.has(key)) {
      students.set(key, {
        studentId: event.studentId,
        studentName: event.studentName,
        githubUsername: event.githubUsername,
        groupName: event.groupName,
        attempts: 0,
        maxLevel: 0,
        assignments: new Set(),
        lastAt: null
      });
    }
    const student = students.get(key);
    student.attempts++;
    student.maxLevel = Math.max(student.maxLevel, Number(event.level) || 1);
    student.assignments.add(event.assignmentName);
    if (!student.lastAt || new Date(event.timestamp) > new Date(student.lastAt)) {
      student.lastAt = event.timestamp;
    }
  }

  res.json({
    totalAttempts: events.length,
    highLevelAttempts: events.filter(e => Number(e.level) >= 3).length,
    students: [...students.values()]
      .map(s => ({ ...s, assignments: [...s.assignments] }))
      .sort((a, b) => b.attempts - a.attempts),
    recent: events.slice(-30).reverse()
  });
});


const migrationReport = migrateData();

app.get("/api/system/migration-status", requireTeacher, (req,res)=>{
  res.json({
    ok:true,
    report:migrationReport,
    dataDir:DATA_DIR,
    localDataDir:LOCAL_DATA_DIR,
    persistent:path.resolve(DATA_DIR)!==path.resolve(LOCAL_DATA_DIR)
  });
});

app.listen(PORT, () => {
  console.log(`Koodiopas v27: ${BASE_URL}`);
  console.log(`GitHub OAuth callback: ${BASE_URL}/auth/github/callback`);
  console.log(`Data directory: ${DATA_DIR}`);
  const changed = migrationReport.filter(x => x.action !== "ok");
  if (changed.length) {
    console.log("Data migration:");
    for (const item of changed) console.log(` - ${item.file}: ${item.action}`);
  } else {
    console.log("Data migration: kaikki tiedostot ovat ajan tasalla.");
  }
});
