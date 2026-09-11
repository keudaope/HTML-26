const $ = id => document.getElementById(id);
const $$ = sel => [...document.querySelectorAll(sel)];
const esc = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
const uid = () => crypto.randomUUID();

let workspace = null;
let helpHistory = [];
let requestedLevel = 1;
let maxHintLevel = 3;

let groupsData = { groups: [] };
let coursesData = { courses: [] };
let previewData = null;
let historyRepoStatuses = new Map();

/* ---------- päävälilehdet ---------- */
function switchMain(view) {
  const teacher = view === "teacher";
  $("studentView").hidden = teacher;
  $("teacherView").hidden = !teacher;
  $("studentTab").classList.toggle("active", !teacher);
  $("teacherTab").classList.toggle("active", teacher);
  if (teacher) checkTeacherSession();
}
$("studentTab").onclick = () => switchMain("student");
$("teacherTab").onclick = () => switchMain("teacher");

/* ---------- opiskelija ---------- */
async function loadStudentSession() {
  const d = await fetch("/api/student/session").then(r => r.json());

  $("studentLoggedOut").hidden = d.authenticated;
  $("studentLoggedIn").hidden = !d.authenticated;
  if (!d.authenticated) return;

  $("studentAvatar").src = d.githubUser.avatarUrl || "";
  $("studentAvatar").hidden = !d.githubUser.avatarUrl;
  $("studentName").textContent = d.student?.name || d.githubUser.name || d.githubUser.login;
  $("studentGithub").textContent = `GitHub: @${d.githubUser.login}${d.group ? ` • ${d.group.name}` : ""}`;

  $("studentUnmatched").hidden = d.matched;
  $("studentWorkspace").hidden = !d.matched;
  if (d.matched) loadWorkspace();
}

async function loadWorkspace() {
  workspace = await fetch("/api/student/workspace").then(r => r.json());
  $("studentCourse").innerHTML = '<option value="">Valitse kurssi</option>' +
    workspace.courses.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
  renderStudentAssignments();
}
function currentStudentCourse() {
  return workspace?.courses.find(c => c.id === $("studentCourse").value);
}
function currentStudentAssignment() {
  return currentStudentCourse()?.assignments.find(a => a.id === $("studentAssignment").value);
}
function renderStudentAssignments() {
  const c = currentStudentCourse();
  $("studentAssignment").innerHTML = '<option value="">Valitse tehtävä</option>' +
    (c?.assignments || []).map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join("");
  updateStudentAssignment();
}

async function loadStudentRepositoryStatus() {
  const c = currentStudentCourse();
  const a = currentStudentAssignment();

  $("repoStatusCard").hidden = true;
  $("repoStatusActions").innerHTML = "";
  $("repoMeta").innerHTML = "";
  $("cloneArea").hidden = true;

  if (!c || !a?.repoUrl) return;

  $("repoStatusCard").hidden = false;
  $("repoStatusTitle").textContent = "Tarkistetaan GitHubista…";
  $("repoStatusText").textContent = "";

  const r = await fetch(
    `/api/student/repository-status?courseId=${encodeURIComponent(c.id)}&assignmentId=${encodeURIComponent(a.id)}`
  );
  const d = await r.json();

  if (!r.ok) {
    $("repoStatusTitle").textContent = "Tilan tarkistus epäonnistui";
    $("repoStatusText").textContent = d.error || "GitHub-repositoryn tilaa ei saatu.";
    return;
  }

  if (d.status === "ready") {
    $("repoStatusTitle").textContent = "✅ Repository on käyttövalmis";
    $("repoStatusText").textContent =
      `${d.private ? "Yksityinen" : "Julkinen"} repository • oletushaara ${d.defaultBranch || "—"}`;

    const bits = [];
    if (d.latestCommit) {
      bits.push(`<div><strong>Viimeisin commit</strong><br><code>${esc(d.latestCommit.shortSha)}</code> ${esc(d.latestCommit.message)}</div>`);
      bits.push(`<div><strong>Tekijä</strong><br>${esc(d.latestCommit.author || "—")}</div>`);
      bits.push(`<div><strong>Aika</strong><br>${d.latestCommit.date ? new Date(d.latestCommit.date).toLocaleString("fi-FI") : "—"}</div>`);
    }
    $("repoMeta").innerHTML = bits.join("");

    $("cloneCommand").textContent = `git clone ${d.cloneUrl}`;
    $("cloneArea").hidden = false;
    $("helpArea").hidden = false;
    return;
  }

  if (d.status === "invitation_pending") {
    $("repoStatusTitle").textContent = "📨 GitHub-kutsu odottaa hyväksymistä";
    $("repoStatusText").textContent =
      "Repository on luotu, mutta sinun pitää hyväksyä GitHubin collaborator-kutsu ennen kuin Koodiopas voi lukea yksityistä repositorya.";
    $("repoStatusActions").innerHTML =
      `<a class="buttonLink" href="${esc(d.invitationUrl)}" target="_blank" rel="noopener">Avaa GitHub-kutsu</a>`;
    $("helpArea").hidden = true;
    $("repoStatusCard").hidden = true;
    return;
  }

  $("repoStatusTitle").textContent = "Repository ei ole vielä käytettävissä";
  $("repoStatusText").textContent =
    "Repositorya ei löytynyt tällä GitHub-kirjautumisella. Tarkista, että tehtävä on jaettu ja että mahdollinen GitHub-kutsu on hyväksytty.";
  $("helpArea").hidden = true;
}

function updateStudentAssignment() {
  const c = currentStudentCourse();
  const a = currentStudentAssignment();
  resetHelp();

  if (!c || !a) {
    $("assignmentInfo").hidden = true;
    $("studentRepo").value = "";
    $("openRepo").removeAttribute("href");
    $("helpArea").hidden = true;
    return;
  }

  $("assignmentInfo").hidden = false;
  $("assignmentInfo").innerHTML = `<strong>${esc(a.name)}</strong><p>${esc(a.instructions || "")}</p>`;
  $("studentRepo").value = a.repoUrl || "";
  $("openRepo").href = a.repoUrl || "#";
  maxHintLevel = Number(a.maxHintLevel || 3);
  $("helpArea").hidden = true;
  updateHintUI();
  loadStudentRepositoryStatus();
}
$("studentCourse").onchange = renderStudentAssignments;
$("studentAssignment").onchange = updateStudentAssignment;

function resetHelp() {
  helpHistory = [];
  requestedLevel = 1;
  $("messages").innerHTML = "";
  $("chatCard").hidden = true;
  $("studentMessage").value = "";
  $("studentStatus").textContent = "";
  updateHintUI();
}
function updateHintUI() {
  const level = Math.min(requestedLevel, maxHintLevel);
  $("hintLevel").textContent = `Vihjetaso ${level}/${maxHintLevel}`;
  $("hintProgress").innerHTML = "";
  for (let i = 1; i <= maxHintLevel; i++) {
    const bar = document.createElement("i");
    if (i <= level) bar.classList.add("on");
    $("hintProgress").append(bar);
  }
}
function addBubble(role, text, label) {
  const article = document.createElement("article");
  article.className = role;
  const small = document.createElement("small");
  small.textContent = label;
  const div = document.createElement("div");
  div.textContent = text;
  article.append(small, div);
  $("messages").append(article);
}

$("askHint").onclick = async () => {
  const c = currentStudentCourse();
  const a = currentStudentAssignment();
  if (!c || !a) return;

  const text = $("studentMessage").value.trim() || "Tarvitsen apua.";
  $("studentStatus").textContent = "Luetaan repositoryn uusin koodi ja muodostetaan vihje…";

  const r = await fetch("/api/student/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      courseId: c.id,
      assignmentId: a.id,
      message: text,
      requestedLevel,
      history: helpHistory
    })
  });
  const d = await r.json();

  if (!r.ok) {
    $("studentStatus").textContent = d.error || "Analyysi epäonnistui.";
    return;
  }

  $("chatCard").hidden = false;
  $("chatTitle").textContent = `${c.name} • ${a.name}`;
  addBubble("student", text, `OPISKELIJA • YRITYS ${helpHistory.length + 1}`);
  addBubble("assistant", d.answer, `KOODIOPAS • VIHJE ${d.level}`);
  helpHistory.push({ student: text, assistant: d.answer });
  requestedLevel = Math.min(maxHintLevel, requestedLevel + 1);
  $("studentMessage").value = "";
  $("studentStatus").textContent = `Analysoitu ${d.files?.length || 0} tiedostoa.`;
  updateHintUI();
};
$("resetHelp").onclick = resetHelp;
$("studentLogout").onclick = async () => {
  await fetch("/api/student/logout", { method: "POST" });
  location.reload();
};


$("copyClone").onclick = async () => {
  const text = $("cloneCommand").textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    $("copyClone").textContent = "Kopioitu ✓";
    setTimeout(() => $("copyClone").textContent = "Kopioi", 1500);
  } catch {
    $("copyClone").textContent = "Kopioi käsin";
  }
};

/* ---------- opettajan kirjautuminen ---------- */
async function checkTeacherSession() {
  const d = await fetch("/api/teacher/session").then(r => r.json());
  $("teacherLoginCard").hidden = d.authenticated;
  $("teacherAdmin").hidden = !d.authenticated;
  if (d.authenticated) showTeacherView("groups");
}
$("teacherLogin").onclick = async () => {
  $("teacherLoginStatus").textContent = "Kirjaudutaan…";
  const r = await fetch("/api/teacher/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: $("teacherPassword").value })
  });
  const d = await r.json();
  if (!r.ok) {
    $("teacherLoginStatus").textContent = d.error || "Virhe";
    return;
  }
  $("teacherPassword").value = "";
  $("teacherLoginStatus").textContent = "";
  checkTeacherSession();
};
$("teacherLogout").onclick = async () => {
  await fetch("/api/teacher/logout", { method: "POST" });
  checkTeacherSession();
};

/* ---------- opettajan näkymät ---------- */
function showTeacherView(view) {
  for (const name of ["groups","courses","github","distribute","history","analytics"]) {
    $(`${name}View`).hidden = name !== view;
  }
  $$(".subtab[data-view]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  if (view === "groups") loadGroups();
  if (view === "courses") loadCourses();
  if (view === "github") loadGithubSettings();
  if (view === "distribute") prepareDistribution();
  if (view === "history") loadHistory();
  if (view === "analytics") loadAnalytics();
}
$$(".subtab[data-view]").forEach(btn => {
  btn.onclick = () => showTeacherView(btn.dataset.view);
});

/* ---------- ryhmät ---------- */
async function loadGroups() {
  groupsData = await fetch("/api/groups").then(r => r.json());
  $("groupsEditor").innerHTML = "";
  groupsData.groups.forEach(addGroupCard);
}
function addGroupCard(group = { id: uid(), name: "", students: [] }) {
  const card = document.createElement("div");
  card.className = "box groupCard";
  card.dataset.id = group.id || uid();
  card.innerHTML = `
    <div class="between">
      <div class="grow"><label>Ryhmän nimi</label><input class="gName"></div>
      <button class="danger removeGroup">Poista ryhmä</button>
    </div>
    <div class="students"></div>
    <button class="secondary addStudent">+ Lisää opiskelija</button>`;
  card.querySelector(".gName").value = group.name || "";
  (group.students || []).forEach(s => addStudentRow(card.querySelector(".students"), s));
  card.querySelector(".addStudent").onclick = () => addStudentRow(card.querySelector(".students"));
  card.querySelector(".removeGroup").onclick = () => card.remove();
  $("groupsEditor").append(card);
}
function addStudentRow(container, student = { id:"", name:"", githubUsername:"" }) {
  const row = document.createElement("div");
  row.className = "studentRow";
  row.innerHTML = `
    <input class="sId" placeholder="Tunniste">
    <input class="sName" placeholder="Opiskelijan nimi">
    <input class="sGithub" placeholder="GitHub-käyttäjänimi">
    <button class="danger removeStudent">Poista</button>`;
  row.querySelector(".sId").value = student.id || "";
  row.querySelector(".sName").value = student.name || "";
  row.querySelector(".sGithub").value = student.githubUsername || "";
  row.querySelector(".removeStudent").onclick = () => row.remove();
  container.append(row);
}
$("addGroup").onclick = () => addGroupCard();
$("saveGroups").onclick = async () => {
  const groups = $$(".groupCard").map(card => ({
    id: card.dataset.id,
    name: card.querySelector(".gName").value.trim(),
    students: [...card.querySelectorAll(".studentRow")].map(row => ({
      id: row.querySelector(".sId").value.trim(),
      name: row.querySelector(".sName").value.trim(),
      githubUsername: row.querySelector(".sGithub").value.trim().replace(/^@/, "")
    })).filter(s => s.id || s.name || s.githubUsername)
  })).filter(g => g.name);

  const r = await fetch("/api/groups", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groups })
  });
  const d = await r.json();
  $("groupsStatus").textContent = r.ok ? "Tallennettu ✓" : (d.error || "Virhe");
};

/* ---------- kurssit ---------- */
async function loadCourses() {
  [coursesData, groupsData] = await Promise.all([
    fetch("/api/courses").then(r => r.json()),
    fetch("/api/groups").then(r => r.json())
  ]);
  $("coursesEditor").innerHTML = "";
  coursesData.courses.forEach(addCourseCard);
}
function addCourseCard(course = { id:uid(), name:"", groupIds:[], assignments:[] }) {
  const card = document.createElement("div");
  card.className = "box courseCard";
  card.dataset.id = course.id || uid();
  card.innerHTML = `
    <div class="between">
      <div class="grow"><label>Kurssin nimi</label><input class="cName"></div>
      <button class="danger removeCourse">Poista kurssi</button>
    </div>
    <label>Kurssiin kuuluvat ryhmät</label>
    <div class="courseGroups"></div>
    <div class="between"><h3>Tehtävät</h3><button class="secondary addAssignment">+ Lisää tehtävä</button></div>
    <div class="assignments"></div>`;

  card.querySelector(".cName").value = course.name || "";
  const groupBox = card.querySelector(".courseGroups");
  groupsData.groups.forEach(group => {
    const label = document.createElement("label");
    label.className = "check";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = group.id;
    cb.checked = (course.groupIds || []).includes(group.id);
    label.append(cb, document.createTextNode(" " + group.name));
    groupBox.append(label);
  });

  (course.assignments || []).forEach(a => addAssignmentRow(card.querySelector(".assignments"), a));
  card.querySelector(".addAssignment").onclick = () => addAssignmentRow(card.querySelector(".assignments"));
  card.querySelector(".removeCourse").onclick = () => card.remove();
  $("coursesEditor").append(card);
}
function addAssignmentRow(container, a = {}) {
  const box = document.createElement("div");
  box.className = "assignment";
  box.dataset.id = a.id || uid();
  box.innerHTML = `
    <div class="assignmentGrid">
      <div><label>Tehtävän nimi</label><input class="aName"></div>
      <div><label>Template repository</label><input class="aTemplate" placeholder="https://github.com/organisaatio/template"></div>
      <div><label>Repository-prefix</label><input class="aPrefix" placeholder="html-tehtava-1"></div>
      <div>
        <label>Koodioppaan avustustaso</label>
        <select class="aLevel">
          <option value="1">1 – pieni vihje</option>
          <option value="2">2 – tarkempi vihje</option>
          <option value="3">3 – rinnakkainen esimerkki</option>
          <option value="4">4 – malliratkaisu mahdollinen</option>
        </select>
      </div>
    </div>
    <label>Tehtävänanto / ohje</label>
    <textarea class="aInstructions" rows="3"></textarea>
    <div class="between">
      <label class="check"><input class="aPrivate" type="checkbox"> Yksityinen repository</label>
      <button class="danger removeAssignment">Poista tehtävä</button>
    </div>`;

  box.querySelector(".aName").value = a.name || "";
  box.querySelector(".aTemplate").value = a.templateRepoUrl || "";
  box.querySelector(".aPrefix").value = a.repoPrefix || "";
  box.querySelector(".aLevel").value = a.maxHintLevel || 3;
  box.querySelector(".aInstructions").value = a.instructions || "";
  box.querySelector(".aPrivate").checked = a.privateRepo !== false;
  box.querySelector(".removeAssignment").onclick = () => box.remove();
  container.append(box);
}
$("addCourse").onclick = () => addCourseCard();
$("saveCourses").onclick = async () => {
  const courses = $$(".courseCard").map(card => ({
    id: card.dataset.id,
    name: card.querySelector(".cName").value.trim(),
    groupIds: [...card.querySelectorAll(".courseGroups input:checked")].map(x => x.value),
    assignments: [...card.querySelectorAll(".assignment")].map(box => {
      const level = Number(box.querySelector(".aLevel").value);
      return {
        id: box.dataset.id,
        name: box.querySelector(".aName").value.trim(),
        templateRepoUrl: box.querySelector(".aTemplate").value.trim(),
        repoPrefix: box.querySelector(".aPrefix").value.trim(),
        instructions: box.querySelector(".aInstructions").value.trim(),
        maxHintLevel: level,
        privateRepo: box.querySelector(".aPrivate").checked,
        allowFullSolution: level === 4,
        minAttemptsBeforeFullSolution: 4
      };
    }).filter(a => a.name)
  })).filter(c => c.name);

  const r = await fetch("/api/courses", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courses })
  });
  const d = await r.json();
  $("coursesStatus").textContent = r.ok ? "Tallennettu ✓" : (d.error || "Virhe");
};

/* ---------- GitHub-asetukset ---------- */
async function loadGithubSettings() {
  const [cfg, gh] = await Promise.all([
    fetch("/api/settings").then(r => r.json()),
    fetch("/api/teacher/github/session").then(r => r.json())
  ]);
  $("githubOrg").value = cfg.githubOrg || "";
  $("defaultPrivate").checked = cfg.defaultRepoPrivate !== false;

  if (gh.connected) {
    $("githubStatus").textContent = `GitHub yhdistetty: @${gh.login}`;
    $("githubActions").innerHTML = '<button id="disconnectGithub" class="secondary">Katkaise GitHub-yhteys</button>';
    $("disconnectGithub").onclick = async () => {
      await fetch("/api/teacher/github/disconnect", { method:"POST" });
      loadGithubSettings();
    };
  } else {
    $("githubStatus").textContent = "GitHub-yhteyttä ei ole vielä.";
    $("githubActions").innerHTML = '<a class="buttonLink" href="/auth/github/start?role=teacher">Yhdistä GitHub</a>';
  }
}
$("saveSettings").onclick = async () => {
  const r = await fetch("/api/settings", {
    method:"PUT",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({
      githubOrg:$("githubOrg").value.trim(),
      defaultRepoPrivate:$("defaultPrivate").checked
    })
  });
  const d = await r.json();
  $("settingsStatus").textContent = r.ok ? "Tallennettu ✓" : (d.error || "Virhe");
};

/* ---------- tehtävien jako ---------- */
async function prepareDistribution() {
  [groupsData, coursesData] = await Promise.all([
    fetch("/api/groups").then(r => r.json()),
    fetch("/api/courses").then(r => r.json())
  ]);

  $("courseSelect").innerHTML = '<option value="">Valitse kurssi</option>' +
    coursesData.courses.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");

  renderDistributionChoices();
  $("previewCard").hidden = true;
  $("resultCard").hidden = true;
}
function currentDistributionCourse() {
  return coursesData.courses.find(c => c.id === $("courseSelect").value);
}
function renderDistributionChoices() {
  const course = currentDistributionCourse();
  $("assignmentSelect").innerHTML = '<option value="">Valitse tehtävä</option>' +
    (course?.assignments || []).map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join("");

  const groupIds = new Set(course?.groupIds || []);
  $("groupSelect").innerHTML = '<option value="">Valitse ryhmä</option>' +
    groupsData.groups.filter(g => groupIds.has(g.id)).map(g => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join("");
}
$("courseSelect").onchange = renderDistributionChoices;

$("preview").onclick = async () => {
  const body = {
    courseId: $("courseSelect").value,
    assignmentId: $("assignmentSelect").value,
    groupId: $("groupSelect").value
  };
  const r = await fetch("/api/distribute/preview", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify(body)
  });
  const d = await r.json();
  if (!r.ok) return alert(d.error || "Esikatselu epäonnistui.");

  previewData = d;
  $("previewCard").hidden = false;
  $("resultCard").hidden = true;
  $("previewInfo").textContent =
    `${d.course.name} • ${d.assignment.name} • ${d.group.name} • ${d.private ? "yksityiset" : "julkiset"} repositoryt`;

  $("previewTable").innerHTML = `
    <table><thead><tr><th>Opiskelija</th><th>GitHub</th><th>Repository</th><th>Valmis</th></tr></thead>
    <tbody>${d.rows.map(x => `
      <tr><td>${esc(x.studentName)}</td><td>${x.githubUsername ? "@" + esc(x.githubUsername) : "—"}</td>
      <td><code>${esc(x.repoUrl)}</code></td><td>${x.valid ? "✅" : "❌ GitHub-tunnus puuttuu"}</td></tr>`).join("")}
    </tbody></table>`;
};

$("distribute").onclick = async () => {
  if (!previewData) return;
  const count = previewData.rows.filter(x => x.valid).length;
  if (!confirm(`Luodaanko ${count} opiskelijarepositorya GitHubiin?`)) return;

  $("distribute").disabled = true;
  $("distribute").textContent = "Jaetaan…";

  const r = await fetch("/api/distribute/run", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({
      courseId:previewData.course.id,
      assignmentId:previewData.assignment.id,
      groupId:previewData.group.id
    })
  });
  const d = await r.json();

  $("distribute").disabled = false;
  $("distribute").textContent = "Jaa tehtävä ryhmälle";

  if (!r.ok) return alert(d.error || "Jako epäonnistui.");

  $("resultCard").hidden = false;
  $("results").innerHTML = `
    <table><thead><tr><th>Opiskelija</th><th>Tila</th><th>Repository</th><th>Huomio</th></tr></thead>
    <tbody>${d.results.map(x => `
      <tr><td>${esc(x.student)}</td><td>${statusLabel(x.status)}</td>
      <td>${x.repoUrl ? `<a href="${esc(x.repoUrl)}" target="_blank" rel="noopener">Avaa</a>` : ""}</td>
      <td>${esc(x.error || "")}</td></tr>`).join("")}
    </tbody></table>`;
};

function statusLabel(status) {
  return status === "created" ? "✅ luotu" :
    status === "exists" ? "ℹ️ oli jo olemassa" :
    status === "created_invite_failed" ? "⚠️ repo luotu, kutsu epäonnistui" :
    status === "skipped" ? "⏭️ ohitettu" : "❌ epäonnistui";
}

/* ---------- historia ---------- */
async function loadHistory() {
  const d = await fetch("/api/teacher/distributions").then(r => r.json());
  const items = (d.distributions || []).slice().reverse();

  $("historyList").innerHTML = items.length ? items.map(dist => `
    <div class="box">
      <div class="between">
        <div><strong>${esc(dist.courseName || "")}</strong> • ${esc(dist.assignmentName || "")}
        <div class="muted">${esc(dist.groupName || "")} • ${new Date(dist.timestamp).toLocaleString("fi-FI")}</div></div>
        <span>${esc(dist.organization || "")}</span>
      </div>
      <table><thead><tr><th>Opiskelija</th><th>Jakotila</th><th>Repository</th><th>GitHub nyt</th><th>Viimeisin commit</th><th>Huomio</th></tr></thead>
      <tbody>${(dist.results || []).map(x => {
        const live = historyRepoStatuses.get(x.repoUrl);
        const liveText = live ? (live.exists ? "✅ löytyy" : "❌ ei löydy") : "—";
        const commit = live?.latestCommit
          ? `<code>${esc(live.latestCommit.shortSha)}</code> ${esc(live.latestCommit.message)}`
          : "—";
        return `<tr><td>${esc(x.student)}</td><td>${statusLabel(x.status)}</td>
        <td>${x.repoUrl ? `<a href="${esc(x.repoUrl)}" target="_blank" rel="noopener">Avaa</a>` : ""}</td>
        <td>${liveText}</td><td>${commit}</td><td>${esc(x.error || "")}</td></tr>`;
      }).join("")}</tbody></table>
    </div>`).join("") : '<p class="muted">Jakohistoriaa ei ole vielä.</p>';
}
$("refreshHistory").onclick = loadHistory;

$("checkHistoryRepos").onclick = async () => {
  const d = await fetch("/api/teacher/distributions").then(r => r.json());
  const urls = [...new Set(
    (d.distributions || [])
      .flatMap(dist => dist.results || [])
      .map(x => x.repoUrl)
      .filter(Boolean)
  )];

  if (!urls.length) return;

  $("checkHistoryRepos").disabled = true;
  $("checkHistoryRepos").textContent = "Tarkistetaan…";

  const r = await fetch("/api/teacher/repository-status", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ urls })
  });
  const result = await r.json();

  $("checkHistoryRepos").disabled = false;
  $("checkHistoryRepos").textContent = "Tarkista repositoryt";

  if (!r.ok) {
    alert(result.error || "Repositoryjen tarkistus epäonnistui.");
    return;
  }

  historyRepoStatuses = new Map((result.results || []).map(item => [item.url, item]));
  loadHistory();
};

/* ---------- analytiikka ---------- */
async function loadAnalytics() {
  const d = await fetch("/api/teacher/analytics").then(r => r.json());
  $("totalAttempts").textContent = d.totalAttempts || 0;
  $("studentCount").textContent = d.students?.length || 0;
  $("highLevelCount").textContent = d.highLevelAttempts || 0;

  $("studentAnalytics").innerHTML = d.students?.length ? `
    <table><thead><tr><th>Opiskelija</th><th>Ryhmä</th><th>Avunpyyntöjä</th><th>Korkein taso</th><th>Tehtävät</th><th>Viimeisin</th></tr></thead>
    <tbody>${d.students.map(s => `
      <tr><td>${esc(s.studentName || s.githubUsername)}<div class="muted">@${esc(s.githubUsername || "")}</div></td>
      <td>${esc(s.groupName || "")}</td><td>${s.attempts}</td><td>${s.maxLevel}</td>
      <td>${esc((s.assignments || []).join(", "))}</td>
      <td>${s.lastAt ? new Date(s.lastAt).toLocaleString("fi-FI") : ""}</td></tr>`).join("")}</tbody></table>`
    : '<p class="muted">Ei vielä analytiikkaa.</p>';

  $("recentAnalytics").innerHTML = d.recent?.length ? `
    <table><thead><tr><th>Aika</th><th>Opiskelija</th><th>Tehtävä</th><th>Taso</th><th>Viesti</th></tr></thead>
    <tbody>${d.recent.map(e => `
      <tr><td>${new Date(e.timestamp).toLocaleString("fi-FI")}</td>
      <td>${esc(e.studentName || e.githubUsername)}</td><td>${esc(e.assignmentName || "")}</td>
      <td>${e.level}</td><td>${esc(e.message || "")}</td></tr>`).join("")}</tbody></table>`
    : '<p class="muted">Ei vielä tapahtumia.</p>';
}

loadStudentSession();
