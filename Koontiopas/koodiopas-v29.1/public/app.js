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
    $("submissionCard").hidden = true;
    $("gitWorkflowCard").hidden = true;
    return;
  }

  $("repoStatusTitle").textContent = "Repository ei ole vielä käytettävissä";
  $("repoStatusText").textContent =
    "Repositorya ei löytynyt tällä GitHub-kirjautumisella. Tarkista, että tehtävä on jaettu ja että mahdollinen GitHub-kutsu on hyväksytty.";
  $("helpArea").hidden = true;
}




async function loadStudentProgress(){
  const card=$("studentProgressCard"); if(!card)return;
  const r=await fetch("/api/student/progress"),d=await r.json();
  if(!r.ok){$("progressSummary").innerHTML=`<span class="muted">${esc(d.error||"Edistymistä ei voitu ladata.")}</span>`;return;}
  const s=d.summary||{};
  $("progressSummary").innerHTML=`
    <div><strong>${s.approved||0}/${s.total||0}</strong><span>hyväksytty</span></div>
    <div><strong>${s.pending||0}</strong><span>arvioitavana</span></div>
    <div><strong>${s.changes||0}</strong><span>korjattavana</span></div>
    <div><strong>${s.average==null?"—":s.average+" %"}</strong><span>arviointien keskiarvo</span></div>`;
  $("progressList").innerHTML=(d.rows||[]).map(x=>{
    const labels={approved:"Hyväksytty",submitted:"Arvioitavana",changes_requested:"Korjattavana",not_submitted:"Ei palautettu"};
    return `<div class="progressItem">
      <div><strong>${esc(x.assignmentName)}</strong><small>${esc(x.courseName)}</small></div>
      <div class="progressRight"><span class="statusPill ${esc(x.status)}">${labels[x.status]||esc(x.status)}</span>
      ${x.assessment?`<strong>${x.assessment.totalPoints}/${x.assessment.maxPoints} p${x.assessment.grade?` • ${esc(x.assessment.grade)}`:""}</strong>`:""}
      ${x.overdue?`<small class="lateText">⚠️ Myöhässä</small>`:""}
      ${x.late?`<small class="lateText">Palautettu myöhässä</small>`:""}
      ${x.dueAt&&!x.overdue&&!x.late?`<small>Määräaika ${new Date(x.dueAt).toLocaleString("fi-FI")}</small>`:""}
      ${x.attempts>1?`<small>${x.attempts} palautusta</small>`:""}</div>
    </div>`;
  }).join("")||'<p class="muted">Tehtäviä ei vielä ole.</p>';
}

async function loadWorkflowStatus() {
  const c = currentStudentCourse();
  const a = currentStudentAssignment();

  $("gitWorkflowCard").hidden = true;
  $("workflowCommands").innerHTML = "";
  $("workflowWarning").hidden = true;

  if (!c || !a?.repoUrl) return;

  $("gitWorkflowCard").hidden = false;
  $("gitWorkflowTitle").textContent = "Tarkistetaan GitHubista…";
  $("gitWorkflowText").textContent = "";

  const r = await fetch(
    `/api/student/workflow-status?courseId=${encodeURIComponent(c.id)}&assignmentId=${encodeURIComponent(a.id)}`
  );
  const d = await r.json();

  if (!r.ok) {
    $("gitWorkflowTitle").textContent = "Git-työtilan tarkistus epäonnistui";
    $("gitWorkflowText").textContent = d.error || "";
    return;
  }

  if (d.repository?.status === "invitation_pending") {
    $("gitWorkflowTitle").textContent = "Hyväksy ensin GitHub-kutsu";
    $("gitWorkflowText").textContent = "Et voi vielä kloonata yksityistä repositorya ennen kutsun hyväksymistä.";
    return;
  }

  if (d.repository?.status !== "ready") {
    $("gitWorkflowTitle").textContent = "Repository ei ole vielä käyttövalmis";
    $("gitWorkflowText").textContent = "Kun repository on luotu ja käyttöoikeus kunnossa, Git-ohjeet tulevat tähän.";
    return;
  }

  $("gitWorkflowTitle").textContent = "✅ GitHub-repository on käyttövalmis";
  $("gitWorkflowText").textContent = d.repository.latestCommit
    ? `GitHubin uusin commit: ${d.repository.latestCommit.shortSha} — ${d.repository.latestCommit.message}`
    : "Repository on käytettävissä.";

  const commands = d.recommendedCommands || [];
  $("workflowCommands").innerHTML = commands.length ? `
    <div class="commandList">
      ${commands.map(cmd => `
        <div class="commandRow">
          <code>${esc(cmd)}</code>
          <button class="copyCommand secondary" data-command="${esc(cmd)}">Kopioi</button>
        </div>`).join("")}
    </div>` : "";

  $$(".copyCommand").forEach(btn => {
    btn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.command);
        btn.textContent = "Kopioitu ✓";
        setTimeout(() => btn.textContent = "Kopioi", 1200);
      } catch {
        btn.textContent = "Kopioi käsin";
      }
    };
  });

  if (d.submission?.status === "submitted" && d.newerCommitAfterSubmission) {
    $("workflowWarning").hidden = false;
    $("workflowWarning").innerHTML =
      `<strong>⚠️ GitHubissa on uudempi commit kuin palautettu versio.</strong>
       <p>Opettaja arvioi edelleen palautettua commitia <code>${esc(d.submission.commitShortSha || "")}</code>.</p>`;
  }

  if (d.submission?.status === "changes_requested" && d.newerCommitAfterSubmission) {
    $("workflowWarning").hidden = false;
    $("workflowWarning").innerHTML =
      `<strong>✅ GitHubissa näkyy uusi commit korjauspyynnön jälkeen.</strong>
       <p>Voit nyt palauttaa uuden version arvioitavaksi.</p>`;
  }
}

async function loadSubmissionStatus() {
  const c = currentStudentCourse();
  const a = currentStudentAssignment();

  $("submissionCard").hidden = true;
  $("teacherFeedbackBox").hidden = true;
  $("submissionActions").innerHTML = "";
  $("submissionMessage").value = "";
  $("submissionMessage").hidden = false;
  $("submissionMessageLabel").hidden = false;
  $("submitAssignment").hidden = false;

  if (!c || !a?.repoUrl) return;

  $("submissionCard").hidden = false;
  const r = await fetch(
    `/api/student/submission-status?courseId=${encodeURIComponent(c.id)}&assignmentId=${encodeURIComponent(a.id)}`
  );
  const d = await r.json();

  if (!r.ok) {
    $("submissionTitle").textContent = "Palautuksen tilaa ei saatu";
    $("submissionText").textContent = d.error || "";
    return;
  }

  const s = d.submission;
  $("assessmentBox").hidden = true;
  if (s?.assessment) {
    $("assessmentBox").hidden = false;
    $("assessmentBox").innerHTML = `<strong>Arviointi: ${s.assessment.totalPoints}/${s.assessment.maxPoints} p (${s.assessment.percent} %)${s.assessment.grade ? ` • Arvosana ${esc(s.assessment.grade)}` : ""}</strong>
      <div class="scoreRows">${(s.assessment.scores||[]).map(x=>`<div><span>${esc(x.name)}</span><strong>${x.points}/${x.maxPoints} p</strong></div>`).join("")}</div>`;
  }
  if (!s) {
    $("submissionTitle").textContent = "Ei vielä palautettu";
    $("submissionText").textContent = "Kun olet valmis, palauta tämänhetkinen GitHub-commit arvioitavaksi.";
    return;
  }

  const when = s.submittedAt ? new Date(s.submittedAt).toLocaleString("fi-FI") : "";
  const commit = s.commitShortSha ? `commit ${s.commitShortSha}` : "palautettu commit";

  if (s.status === "submitted") {
    $("submissionTitle").textContent = "⏳ Odottaa opettajan arviointia";
    $("submissionText").textContent = `${commit} • palautettu ${when}`;
    $("submissionMessage").hidden = true;
    $("submissionMessageLabel").hidden = true;
    $("submitAssignment").hidden = true;
    return;
  }

  if (s.status === "approved") {
    $("submissionTitle").textContent = "✅ Hyväksytty";
    $("submissionText").textContent = `${commit} • palautettu ${when}`;
    $("submissionMessage").hidden = true;
    $("submissionMessageLabel").hidden = true;
    $("submitAssignment").hidden = true;
  }

  if (s.status === "changes_requested") {
    $("submissionTitle").textContent = "🔧 Palautettu korjattavaksi";
    $("submissionText").textContent = `${commit} • tee korjaukset, committaa GitHubiin ja palauta uudelleen.`;
    $("submitAssignment").textContent = "Palauta uusi versio arvioitavaksi";
  } else {
    $("submitAssignment").textContent = "Palauta arvioitavaksi";
  }

  if (s.teacherFeedback) {
    $("teacherFeedbackBox").hidden = false;
    $("teacherFeedbackBox").innerHTML = `<strong>Opettajan palaute</strong><p>${esc(s.teacherFeedback)}</p>`;
  }
}


function formatDurationMinutes(minutes){
  if(minutes==null)return "";
  const abs=Math.abs(minutes);
  const days=Math.floor(abs/1440);
  const hours=Math.floor((abs%1440)/60);
  const mins=abs%60;
  const parts=[];
  if(days)parts.push(`${days} pv`);
  if(hours)parts.push(`${hours} h`);
  if(!days && mins)parts.push(`${mins} min`);
  return parts.join(" ")||"alle minuutti";
}

function renderAssignmentDeadline(a){
  const box=$("deadlineBox");
  if(!a?.dueAt){box.hidden=true;return;}
  const due=new Date(a.dueAt);
  if(Number.isNaN(due.getTime())){box.hidden=true;return;}
  const minutes=Math.round((due.getTime()-Date.now())/60000);
  box.hidden=false;
  box.classList.toggle("overdue",minutes<0);
  box.innerHTML=minutes<0
    ? `<strong>⚠️ Määräaika meni ${formatDurationMinutes(minutes)} sitten</strong><span>${due.toLocaleString("fi-FI")}</span>`
    : `<strong>⏰ Aikaa jäljellä ${formatDurationMinutes(minutes)}</strong><span>Määräaika ${due.toLocaleString("fi-FI")}</span>`;
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
  loadWorkflowStatus();
  loadSubmissionStatus();
  loadStudentProgress();
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


$("refreshWorkflow").onclick = async () => {
  await loadStudentRepositoryStatus();
  await loadWorkflowStatus();
  await loadSubmissionStatus();
  await loadWorkflowStatus();
};

$("submitAssignment").onclick = async () => {
  const c = currentStudentCourse();
  const a = currentStudentAssignment();
  if (!c || !a) return;

  if (!confirm("Palautetaanko repositoryn tämänhetkinen uusin commit opettajalle arvioitavaksi?")) return;

  $("submitAssignment").disabled = true;
  $("submitAssignment").textContent = "Palautetaan…";

  const r = await fetch("/api/student/submit", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({
      courseId:c.id,
      assignmentId:a.id,
      message:$("submissionMessage").value.trim()
    })
  });
  const d = await r.json();

  $("submitAssignment").disabled = false;

  if (!r.ok) {
    $("submitAssignment").textContent = "Palauta arvioitavaksi";
    alert(d.error || "Palautus epäonnistui.");
    return;
  }

  await loadSubmissionStatus();
};

/* ---------- opettajan kirjautuminen ---------- */
async function checkTeacherSession() {
  const d = await fetch("/api/teacher/session").then(r => r.json());
  $("teacherLoginCard").hidden = d.authenticated;
  $("teacherAdmin").hidden = !d.authenticated;
  if (d.authenticated) showTeacherView("dashboard");
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
  for (const name of ["dashboard","groups","courses","github","distribute","rubrics","submissions","history","analytics","system"]) {
    $(`${name}View`).hidden = name !== view;
  }
  $$(".subtab[data-view]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  if (view === "dashboard") loadDashboard();
  if (view === "groups") loadGroups();
  if (view === "courses") loadCourses();
  if (view === "github") loadGithubSettings();
  if (view === "distribute") prepareDistribution();
  if (view === "rubrics") loadRubricAdmin();
  if (view === "submissions") loadSubmissions();
  if (view === "history") loadHistory();
  if (view === "analytics") loadAnalytics();
  if (view === "system") resetRestoreUI();
}
$$(".subtab[data-view]").forEach(btn => {
  btn.onclick = () => showTeacherView(btn.dataset.view);
});



async function loadMigrationStatus(){
  const target=$("migrationStatus"); if(!target)return;
  const r=await fetch("/api/system/migration-status"),d=await r.json();
  if(!r.ok){target.textContent=d.error||"Migraation tilaa ei voitu lukea.";return;}
  const location=$("dataLocation");
  if(location){
    location.innerHTML=`<strong>Pysyvä datahakemisto</strong><code>${esc(d.dataDir||"")}</code>
      <small>${d.persistent?"Versioiden yhteinen data":"Version paikallinen data"}</small>`;
  }
  const changed=(d.report||[]).filter(x=>x.action!=="ok");
  if(!changed.length){
    target.innerHTML="✅ Data on ajan tasalla. Olemassa olevia käyttäjätietoja ei muutettu.";
    return;
  }
  target.innerHTML=`<div class="migrationList">${changed.map(x=>{
    const label=x.action==="created"?"luotu":
      x.action==="updated"?"täydennetty":
      x.action==="schema-updated"?"rakennetta täydennetty":
      x.action==="repaired"?"korjattu varmuuskopiosta":
      x.action==="imported-from-local"?"tuotu vanhasta data-kansiosta":
      "päivitetty";
    return `<div><code>${esc(x.file.replace("./data/",""))}</code><span>${label}</span></div>`;
  }).join("")}</div>`;
}
$("refreshMigration").onclick=loadMigrationStatus;

/* ---------- dashboard ---------- */
let dashboardData=null;
async function loadDashboard(){
  loadMigrationStatus();
  const r=await fetch("/api/teacher/dashboard"),d=await r.json();
  if(!r.ok){alert(d.error||"Dashboardia ei voitu ladata.");return;}
  dashboardData=d;
  $("dashStudents").textContent=d.summary?.students||0;
  $("dashAttention").textContent=d.summary?.attention||0;
  $("dashPending").textContent=d.summary?.pending||0;
  $("dashChanges").textContent=d.summary?.changes||0;
  $("dashOverdue").textContent=d.summary?.overdue||0;

  $("groupDashboard").innerHTML=(d.groups||[]).length?`
  <table><thead><tr><th>Ryhmä</th><th>Opiskelijoita</th><th>Valmistumisaste</th><th>Keskiarvo</th><th>Huomiota</th></tr></thead>
  <tbody>${d.groups.map(g=>`<tr><td>${esc(g.groupName)}</td><td>${g.students}</td><td>${g.completion} %</td><td>${g.average==null?"—":g.average+" %"}</td><td>${g.attention}</td></tr>`).join("")}</tbody></table>`
  :'<p class="muted">Ryhmiä ei vielä ole.</p>';

  const cur=$("dashboardGroupFilter").value;
  $("dashboardGroupFilter").innerHTML='<option value="">Kaikki ryhmät</option>'+
    (d.groups||[]).map(g=>`<option value="${esc(g.groupId)}">${esc(g.groupName)}</option>`).join("");
  $("dashboardGroupFilter").value=cur;
  renderStudentDashboard();
}
function renderStudentDashboard(){
  if(!dashboardData)return;
  const gid=$("dashboardGroupFilter").value;
  const attentionOnly=$("dashboardAttentionFilter").value==="attention";
  const rows=(dashboardData.students||[]).filter(x=>(!gid||x.groupId===gid)&&(!attentionOnly||x.attention));

  $("studentDashboard").innerHTML=rows.length?`
  <table><thead><tr><th>Opiskelija</th><th>Ryhmä</th><th>Valmis</th><th>Arvioitavana</th><th>Korjattavana</th><th>Ei palautettu</th><th>Myöhässä</th><th>Keskiarvo</th><th>Avunpyynnöt</th><th>Tila</th></tr></thead>
  <tbody>${rows.map(x=>`<tr class="${x.attention?"attentionRow":""}">
  <td><strong>${esc(x.studentName||x.githubUsername)}</strong><div class="muted">@${esc(x.githubUsername||"")}</div></td>
  <td>${esc(x.groupName)}</td><td>${x.approved}/${x.total} (${x.completion} %)</td><td>${x.pending}</td><td>${x.changes}</td><td>${x.notSubmitted}</td><td>${x.overdue}</td>
  <td>${x.average==null?"—":x.average+" %"}</td><td>${x.helpRequests}${x.highHelp?` • taso 3–4: ${x.highHelp}`:""}</td>
  <td>${x.attention?'<span class="attentionBadge">⚠️ Huomio</span>':'✅ OK'}</td></tr>`).join("")}</tbody></table>`
  :'<p class="muted">Valinnalla ei löytynyt opiskelijoita.</p>';
}
$("dashboardGroupFilter").onchange=renderStudentDashboard;
$("dashboardAttentionFilter").onchange=renderStudentDashboard;
$("refreshDashboard").onclick=loadDashboard;


/* ---------- varmuuskopiointi ---------- */
let restorePayload=null;

$("downloadFullBackup").onclick=()=>{
  window.location.href="/api/teacher/full-backup";
};

function resetRestoreUI(){
  restorePayload=null;
  $("restorePreview").hidden=true;
  $("confirmRestore").hidden=true;
  $("restoreStatus").textContent="";
}

$("restoreBackupFile").onchange=resetRestoreUI;

$("previewRestore").onclick=async()=>{
  const file=$("restoreBackupFile").files?.[0];
  if(!file){
    $("restoreStatus").textContent="Valitse ensin varmuuskopiotiedosto.";
    return;
  }

  let payload;
  try{
    payload=JSON.parse(await file.text());
  }catch{
    $("restoreStatus").textContent="Tiedosto ei ole kelvollinen JSON.";
    return;
  }

  const r=await fetch("/api/teacher/full-restore/preview",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(payload)
  });
  const d=await r.json();

  if(!r.ok){
    $("restoreStatus").textContent=d.error||"Varmuuskopion tarkistus epäonnistui.";
    return;
  }

  restorePayload=payload;
  $("restorePreview").hidden=false;
  $("restorePreview").innerHTML=`
    <h3>Varmuuskopio näyttää kelvolliselta</h3>
    <p>${d.createdAt?`Luotu: ${new Date(d.createdAt).toLocaleString("fi-FI")} • `:""}Koodiopas ${esc(d.appVersion||"")}</p>
    <div class="backupSummary">
      <div><strong>${d.summary.groups}</strong><span>ryhmää</span></div>
      <div><strong>${d.summary.students}</strong><span>opiskelijaa</span></div>
      <div><strong>${d.summary.courses}</strong><span>kurssia</span></div>
      <div><strong>${d.summary.assignments}</strong><span>tehtävää</span></div>
      <div><strong>${d.summary.submissions}</strong><span>palautusta</span></div>
      <div><strong>${d.summary.rubrics}</strong><span>rubriikkia</span></div>
    </div>`;
  $("confirmRestore").hidden=false;
  $("restoreStatus").textContent="";
};

$("confirmRestore").onclick=async()=>{
  if(!restorePayload)return;
  if(!confirm("Tämä korvaa nykyisen Koodiopas-datan varmuuskopion sisällöllä. Nykyisestä datasta tehdään ensin turvavarmuuskopio. Jatketaanko?"))return;

  $("confirmRestore").disabled=true;
  $("confirmRestore").textContent="Palautetaan…";

  const r=await fetch("/api/teacher/full-restore",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(restorePayload)
  });
  const d=await r.json();

  $("confirmRestore").disabled=false;
  $("confirmRestore").textContent="Palauta tämä varmuuskopio";

  if(!r.ok){
    $("restoreStatus").textContent=d.error||"Palautus epäonnistui.";
    return;
  }

  $("restoreStatus").innerHTML=`✅ Palautus onnistui.<br><small>Turvavarmuuskopio: <code>${esc(d.safetyBackup||"")}</code></small>`;
  restorePayload=null;
  $("restorePreview").hidden=true;
  $("confirmRestore").hidden=true;
};

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
  $("exportCourseSelect").innerHTML='<option value="">Valitse vietävä kurssi</option>'+
    coursesData.courses.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
}
function addCourseCard(course = { id:uid(), name:"", groupIds:[], assignments:[] }) {
  const card = document.createElement("div");
  card.className = "box courseCard";
  card.dataset.id = course.id || uid();
  card.innerHTML = `
    <div class="between">
      <div class="grow"><label>Kurssin nimi</label><input class="cName">
      <div class="courseRepoSettings">
        <h3>Kurssin repository</h3>
        <p class="muted">Jokaiselle opiskelijalle luodaan yksi repository koko kurssia varten.</p>
        <label>Kurssirepositoryn prefix</label><input class="cRepoPrefix" placeholder="html-2026">
        <label>Kurssin template repository</label><input class="cTemplate" placeholder="https://github.com/organisaatio/html-kurssi-template">
        <label class="check"><input class="cPrivate" type="checkbox"> Yksityinen repository</label>
      </div></div>
      <button class="danger removeCourse">Poista kurssi</button>
    </div>
    <label>Kurssiin kuuluvat ryhmät</label>
    <div class="courseGroups"></div>
    <div class="between"><h3>Tehtävät</h3><button class="secondary addAssignment">+ Lisää tehtävä</button></div>
    <div class="assignments"></div>`;

  card.querySelector(".cName").value = course.name || "";
  card.querySelector(".cRepoPrefix").value = course.repoPrefix || slugClient(course.name||"kurssi");
  card.querySelector(".cTemplate").value = course.templateRepoUrl || "";
  card.querySelector(".cPrivate").checked = course.privateRepo !== false;
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
function slugClient(value){
  return String(value||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"tehtava";
}
function addAssignmentRow(container, a = {}) {
  const box = document.createElement("div");
  box.className = "assignment";
  box.dataset.id = a.id || uid();
  box.innerHTML = `
    <div class="assignmentGrid">
      <div><label>Tehtävän nimi</label><input class="aName"></div>
      <div><label>Tehtävän kansio</label><input class="aFolder" placeholder="tehtava-01-html-perusteet"></div>
      <div><label>Julkaisu</label><label class="check"><input class="aPublished" type="checkbox"> Tehtävä julkaistu</label></div>
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
    <div class="assignmentDeadline">
      <label>Palautuksen määräaika</label>
      <input class="aDueAt" type="datetime-local">
      <small>Jätä tyhjäksi, jos tehtävällä ei ole määräaikaa.</small>
    </div>
    <div class="between">
      <span class="muted">Tallennetaan kurssin yhteiseen repositoryyn.</span>
      <button class="danger removeAssignment">Poista tehtävä</button>
    </div>`;

  box.querySelector(".aName").value = a.name || "";
  box.querySelector(".aFolder").value = a.folder || `tehtava-${String(container.children.length+1).padStart(2,"0")}-${slugClient(a.name||"tehtava")}`;
  box.querySelector(".aPublished").checked = a.published !== false;
  box.querySelector(".aLevel").value = a.maxHintLevel || 3;
  box.querySelector(".aInstructions").value = a.instructions || "";
  if (a.dueAt) {
    const date=new Date(a.dueAt);
    if(!Number.isNaN(date.getTime())) {
      const local=new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
      box.querySelector(".aDueAt").value=local;
    }
  }

  box.querySelector(".removeAssignment").onclick = () => box.remove();
  container.append(box);
}
$("addCourse").onclick = () => addCourseCard();
$("saveCourses").onclick = async () => {
  try {
    $("coursesStatus").textContent = "Tallennetaan…";
    const courses = $$(".courseCard").map(card => ({
    id: card.dataset.id,
    name: card.querySelector(".cName").value.trim(),
    repoPrefix: card.querySelector(".cRepoPrefix").value.trim() || slugClient(card.querySelector(".cName").value),
    templateRepoUrl: card.querySelector(".cTemplate").value.trim(),
    privateRepo: card.querySelector(".cPrivate").checked,
    groupIds: [...card.querySelectorAll(".courseGroups input:checked")].map(x => x.value),
    assignments: [...card.querySelectorAll(".assignment")].map(box => {
      const level = Number(box.querySelector(".aLevel").value);
      return {
        id: box.dataset.id,
        name: box.querySelector(".aName").value.trim(),
        folder: box.querySelector(".aFolder").value.trim() || `tehtava-${slugClient(box.querySelector(".aName").value)}`,
        published: box.querySelector(".aPublished").checked,
        instructions: box.querySelector(".aInstructions").value.trim(),
        dueAt: box.querySelector(".aDueAt").value ? new Date(box.querySelector(".aDueAt").value).toISOString() : "",
        maxHintLevel: level,
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
    if (r.ok) await loadCourses();
  } catch (error) {
    console.error("Kurssien tallennus epäonnistui:", error);
    $("coursesStatus").textContent = `Tallennus epäonnistui: ${error.message}`;
  }
};


/* ---------- kurssin vienti / tuonti ---------- */
$("exportCourse").onclick=()=>{
  const id=$("exportCourseSelect").value;
  if(!id){$("courseTransferStatus").textContent="Valitse ensin kurssi.";return;}
  window.location.href=`/api/teacher/course-export/${encodeURIComponent(id)}`;
};

$("importCourse").onclick=async()=>{
  const file=$("importCourseFile").files?.[0];
  if(!file){$("courseTransferStatus").textContent="Valitse JSON-kurssipaketti.";return;}
  $("courseTransferStatus").textContent="Tuodaan…";
  let payload;
  try{
    payload=JSON.parse(await file.text());
  }catch{
    $("courseTransferStatus").textContent="Tiedosto ei ole kelvollinen JSON.";
    return;
  }

  const r=await fetch("/api/teacher/course-import",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(payload)
  });
  const d=await r.json();
  if(!r.ok){
    $("courseTransferStatus").textContent=d.error||"Tuonti epäonnistui.";
    return;
  }

  $("courseTransferStatus").textContent=`Tuotu ✓ ${d.importedAssignments} tehtävää, ${d.importedRubrics} rubriikkia`;
  $("importCourseFile").value="";
  await loadCourses();
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


/* ---------- arviointijono ---------- */
async function loadSubmissions() {
  const d = await fetch("/api/teacher/submissions").then(r => r.json());

  $("submittedCount").textContent = d.counts?.submitted || 0;
  $("changesCount").textContent = d.counts?.changesRequested || 0;
  $("approvedCount").textContent = d.counts?.approved || 0;

  const items = d.submissions || [];
  $("submissionQueue").innerHTML = items.length ? items.map(s => {
    const state =
      s.status === "submitted" ? "⏳ Odottaa arviointia" :
      s.status === "changes_requested" ? "🔧 Korjattavaksi" :
      "✅ Hyväksytty";

    const feedback = s.teacherFeedback
      ? `<div class="feedbackBox"><strong>Nykyinen palaute</strong><p>${esc(s.teacherFeedback)}</p></div>`
      : "";

    return `
      <div class="submissionItem">
        <div class="between">
          <div>
            <h3>${esc(s.studentName || s.githubUsername)} • ${esc(s.assignmentName)}</h3>
            <p class="muted">${esc(s.groupName || "")} • ${esc(s.courseName || "")}${s.dueAt?` • määräaika ${new Date(s.dueAt).toLocaleString("fi-FI")}`:""}</p>
            ${s.late?`<span class="lateBadge">⚠️ Palautettu myöhässä (${formatDurationMinutes(s.minutesLate)})</span>`:""}
          </div>
          <strong>${state}</strong>
        </div>

        <div class="submissionMeta">
          <div><span>Palautettu</span><strong>${new Date(s.submittedAt).toLocaleString("fi-FI")}</strong></div>
          <div><span>Palautettu commit</span><strong><code>${esc(s.commitShortSha || "")}</code></strong></div>
          <div><span>Commit-viesti</span><strong>${esc(s.commitMessage || "—")}</strong></div>
          <div><span>GitHubin uusin</span><strong>${s.currentLatestCommit ? `<code>${esc(s.currentLatestCommit.shortSha)}</code>` : "—"}</strong></div>
        </div>
        ${s.newerCommitAfterSubmission ? `<div class="workflowWarning"><strong>⚠️ Repositoryssa on palautuksen jälkeen uudempi commit.</strong><p>Arviointi kohdistuu edelleen palautettuun committiin <code>${esc(s.commitShortSha || "")}</code>.</p></div>` : ""}

        ${s.studentMessage ? `<div class="studentNote"><strong>Opiskelijan viesti</strong><p>${esc(s.studentMessage)}</p></div>` : ""}
        ${feedback}

        <div class="row">
          <a class="buttonLink secondaryLink" href="${esc(s.repoUrl)}" target="_blank" rel="noopener">Avaa repository</a>
          <a class="buttonLink secondaryLink" href="${esc(s.repoUrl)}/commit/${esc(s.commitSha)}" target="_blank" rel="noopener">Avaa palautettu commit</a>
        </div>

        <div class="rubricArea"><div class="between"><strong>Arviointikriteerit</strong><span class="rubricTotal" data-id="${esc(s.id)}">Ladataan…</span></div><div class="rubricRows" data-id="${esc(s.id)}"></div></div>
        <label>Palaute opiskelijalle</label>
        <textarea class="reviewFeedback" data-id="${esc(s.id)}" rows="3" placeholder="Kirjoita palaute...">${esc(s.teacherFeedback || "")}</textarea>
        <div class="row">
          <button class="approveSubmission" data-id="${esc(s.id)}">Hyväksy</button>
          <button class="changesSubmission secondary" data-id="${esc(s.id)}">Palauta korjattavaksi</button>
        </div>
      </div>`;
  }).join("") : '<p class="muted">Ei palautuksia vielä.</p>';

  for (const s of items) await loadRubricForSubmission(s.id);

  $$(".suggestAssessment").forEach(btn => { btn.onclick = () => suggestAssessment(btn.dataset.id, btn); });
  $$(".approveSubmission").forEach(btn => {
    btn.onclick = () => reviewSubmission(btn.dataset.id, "approved");
  });
  $$(".changesSubmission").forEach(btn => {
    btn.onclick = () => reviewSubmission(btn.dataset.id, "changes_requested");
  });
}


async function loadRubricAdmin(){
  coursesData=await fetch("/api/courses").then(r=>r.json());
  $("rubricCourse").innerHTML='<option value="">Valitse kurssi</option>'+coursesData.courses.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
  $("rubricAssignment").innerHTML='<option value="">Valitse tehtävä</option>';$("rubricEditor").hidden=true;
}
$("rubricCourse").onchange=()=>{const c=coursesData.courses.find(x=>x.id===$("rubricCourse").value);$("rubricAssignment").innerHTML='<option value="">Valitse tehtävä</option>'+(c?.assignments||[]).map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join("");$("rubricEditor").hidden=true;};
$("rubricAssignment").onchange=loadSelectedRubric;
async function loadSelectedRubric(){const courseId=$("rubricCourse").value,assignmentId=$("rubricAssignment").value;if(!courseId||!assignmentId){$("rubricEditor").hidden=true;return;}const d=await fetch(`/api/teacher/rubric?courseId=${encodeURIComponent(courseId)}&assignmentId=${encodeURIComponent(assignmentId)}`).then(r=>r.json());$("rubricEditor").hidden=false;renderCriteria(d.rubric?.criteria||[]);renderGrades(d.rubric?.gradeBoundaries||[]);}
function renderCriteria(items){$("criterionRows").innerHTML="";items.forEach(addCriterionRow);}
function addCriterionRow(c={id:crypto.randomUUID(),name:"",maxPoints:5}){const row=document.createElement("div");row.className="criterionRow";row.dataset.id=c.id;row.innerHTML='<input class="criterionName" placeholder="Kriteerin nimi"><input class="criterionMax" type="number" min="1" max="100"><button class="danger removeCriterion">Poista</button>';row.querySelector(".criterionName").value=c.name||"";row.querySelector(".criterionMax").value=c.maxPoints||5;row.querySelector(".removeCriterion").onclick=()=>row.remove();$("criterionRows").append(row);}
$("addCriterion").onclick=()=>addCriterionRow();
function renderGrades(items){const g=items.length?items:[{grade:"Hylätty",minPercent:0},{grade:"1",minPercent:50},{grade:"2",minPercent:60},{grade:"3",minPercent:70},{grade:"4",minPercent:80},{grade:"5",minPercent:90}];$("gradeRows").innerHTML=g.map(x=>`<div class="gradeRow"><input class="gradeName" value="${esc(x.grade)}"><input class="gradeMin" type="number" min="0" max="100" value="${x.minPercent}"><span>% alkaen</span></div>`).join("");}
$("saveRubric").onclick=async()=>{const criteria=[...document.querySelectorAll(".criterionRow")].map(r=>({id:r.dataset.id,name:r.querySelector(".criterionName").value.trim(),maxPoints:Number(r.querySelector(".criterionMax").value)||1})).filter(x=>x.name);const gradeBoundaries=[...document.querySelectorAll(".gradeRow")].map(r=>({grade:r.querySelector(".gradeName").value.trim(),minPercent:Number(r.querySelector(".gradeMin").value)||0})).filter(x=>x.grade);const r=await fetch("/api/teacher/rubric",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({courseId:$("rubricCourse").value,assignmentId:$("rubricAssignment").value,criteria,gradeBoundaries})});const d=await r.json();$("rubricStatus").textContent=r.ok?"Tallennettu ✓":(d.error||"Virhe");};
async function suggestAssessment(id,button){const old=button.textContent;button.disabled=true;button.textContent="Analysoidaan…";const r=await fetch(`/api/teacher/submissions/${encodeURIComponent(id)}/suggest-assessment`,{method:"POST"});const d=await r.json();button.disabled=false;button.textContent=old;if(!r.ok){alert(d.error||"Arviointiehdotus epäonnistui.");return;}for(const s of d.suggestion?.scores||[]){const input=document.querySelector(`.rubricScore[data-submission="${CSS.escape(id)}"][data-criterion="${CSS.escape(s.id)}"]`);if(input)input.value=s.points;}updateRubricTotal(id);const f=document.querySelector(`.reviewFeedback[data-id="${CSS.escape(id)}"]`);if(f&&d.suggestion?.feedback)f.value=d.suggestion.feedback;}

async function loadRubricForSubmission(id){
  const r=await fetch(`/api/teacher/submissions/${encodeURIComponent(id)}/rubric`),d=await r.json();
  const box=document.querySelector(`.rubricRows[data-id="${CSS.escape(id)}"]`);
  if(!box||!r.ok)return;
  const old=new Map((d.assessment?.scores||[]).map(x=>[x.id,x.points]));
  box.innerHTML=(d.rubric.criteria||[]).map(c=>`<div class="rubricRow"><span>${esc(c.name)}</span><div><input class="rubricScore" data-submission="${esc(id)}" data-criterion="${esc(c.id)}" type="number" min="0" max="${c.maxPoints}" value="${old.has(c.id)?old.get(c.id):c.maxPoints}"> / ${c.maxPoints} p</div></div>`).join("");
  document.querySelectorAll(`.rubricScore[data-submission="${CSS.escape(id)}"]`).forEach(x=>x.oninput=()=>updateRubricTotal(id));
  updateRubricTotal(id);
}
function updateRubricTotal(id){
  const a=[...document.querySelectorAll(`.rubricScore[data-submission="${CSS.escape(id)}"]`)];
  const t=a.reduce((s,x)=>s+(Number(x.value)||0),0),m=a.reduce((s,x)=>s+(Number(x.max)||0),0);
  const e=document.querySelector(`.rubricTotal[data-id="${CSS.escape(id)}"]`); if(e)e.textContent=`${t}/${m} p`;
}
function assessmentFromUI(id){
  return {scores:[...document.querySelectorAll(`.rubricScore[data-submission="${CSS.escape(id)}"]`)].map(x=>({id:x.dataset.criterion,points:Number(x.value)||0}))};
}

async function reviewSubmission(id, status) {
  const textarea = document.querySelector(`.reviewFeedback[data-id="${CSS.escape(id)}"]`);
  const feedback = textarea?.value.trim() || "";

  if (status === "changes_requested" && !feedback) {
    alert("Kirjoita opiskelijalle palaute ennen kuin palautat työn korjattavaksi.");
    return;
  }

  const r = await fetch(`/api/teacher/submissions/${encodeURIComponent(id)}/review`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ status, feedback, assessment: assessmentFromUI(id) })
  });
  const d = await r.json();

  if (!r.ok) {
    alert(d.error || "Arviointi epäonnistui.");
    return;
  }

  loadSubmissions();
}

$("refreshSubmissions").onclick = loadSubmissions;

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

if ($("refreshProgress")) $("refreshProgress").onclick=loadStudentProgress;
