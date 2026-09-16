import express from "express";
import dotenv from "dotenv";
import session from "express-session";
import fs from "fs";
import crypto from "crypto";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";

const FILES = {
  groups: "./data/groups.json",
  courses: "./data/courses.json",
  distributions: "./data/distributions.json",
  analytics: "./data/analytics.json",
  settings: "./data/app-settings.json"
};

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
    "User-Agent": "Koodiopas-v16"
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

/* --------------------------------------------------
   OPETTAJAN SEURANTA
-------------------------------------------------- */
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

app.listen(PORT, () => {
  console.log(`Koodiopas v16: ${BASE_URL}`);
  console.log(`GitHub OAuth callback: ${BASE_URL}/auth/github/callback`);
});
