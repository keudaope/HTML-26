const $ = id => document.getElementById(id);
const $$ = selector => [...document.querySelectorAll(selector)];

let project = null;
let history = [];
let requestedLevel = 1;
let maxHintLevel = 3;

function switchView(view) {
  const teacher = view === "teacher";
  $("studentView").hidden = teacher;
  $("teacherView").hidden = !teacher;
  $("studentTab").classList.toggle("active", !teacher);
  $("teacherTab").classList.toggle("active", teacher);

  if (teacher) checkTeacherSession();
}

$("studentTab").onclick = () => switchView("student");
$("teacherTab").onclick = () => switchView("teacher");

function showStatus(text, error = false) {
  $("status").hidden = false;
  $("status").textContent = text;
  $("status").className = error ? "error" : "";
}

function clearStatus() {
  $("status").hidden = true;
}

function updateStudentUI() {
  const effectiveLevel = Math.min(requestedLevel, maxHintLevel);
  $("level").textContent = `Vihjetaso ${effectiveLevel}/${maxHintLevel}`;
  $("progress").innerHTML = "";

  for (let i = 1; i <= maxHintLevel; i++) {
    const bar = document.createElement("i");
    if (i <= effectiveLevel) bar.classList.add("on");
    $("progress").appendChild(bar);
  }
}

function resetSession() {
  history = [];
  requestedLevel = 1;
  $("messages").innerHTML = "";
  $("chat").hidden = true;
  $("msg").value = "";
  updateStudentUI();
}

function addBubble(role, text, label) {
  const article = document.createElement("article");
  article.className = role;

  const meta = document.createElement("small");
  meta.textContent = label;

  const content = document.createElement("div");
  content.textContent = text;

  article.append(meta, content);
  $("messages").append(article);
}

async function loadPublicConfig() {
  try {
    const response = await fetch("/api/config/public");
    const config = await response.json();

    if (config.teacherMessage) {
      $("teacherNotice").textContent = config.teacherMessage;
      $("teacherNotice").hidden = false;
    } else {
      $("teacherNotice").hidden = true;
    }
  } catch {}
}

async function checkTeacherSession() {
  const response = await fetch("/api/teacher/session");
  const data = await response.json();

  $("teacherLoginCard").hidden = data.authenticated;
  $("teacherAdmin").hidden = !data.authenticated;

  if (data.authenticated) loadTeacherConfig();
}

$("teacherLogin").onclick = async () => {
  $("loginStatus").textContent = "Kirjaudutaan…";

  try {
    const response = await fetch("/api/teacher/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: $("teacherPassword").value })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Kirjautuminen epäonnistui.");

    $("teacherPassword").value = "";
    $("loginStatus").textContent = "";
    await checkTeacherSession();
  } catch (error) {
    $("loginStatus").textContent = error.message;
  }
};

$("teacherLogout").onclick = async () => {
  await fetch("/api/teacher/logout", { method: "POST" });
  await checkTeacherSession();
};

async function loadTeacherConfig() {
  const response = await fetch("/api/config");
  if (response.status === 401) return checkTeacherSession();

  const config = await response.json();

  $("teacherMessage").value = config.teacherMessage || "";
  $("defaultMaxHintLevel").value = config.defaultMaxHintLevel || 3;
  $("allowFullSolution").checked = Boolean(config.allowFullSolution);
  $("minAttempts").value = config.minAttemptsBeforeFullSolution || 4;

  renderRules(config.projectRules || []);
}

function renderRules(rules) {
  $("rules").innerHTML = "";
  rules.forEach(rule => addRuleRow(rule));
}

function addRuleRow(rule = {}) {
  const row = document.createElement("div");
  row.className = "ruleRow";

  const match = document.createElement("input");
  match.className = "ruleMatch";
  match.placeholder = "Esim. Projekti 1A";
  match.value = rule.match || "";

  const level = document.createElement("select");
  level.className = "ruleLevel";
  [1,2,3,4].forEach(n => {
    const option = document.createElement("option");
    option.value = n;
    option.textContent = n;
    level.appendChild(option);
  });
  level.value = rule.maxHintLevel || 3;

  const attempts = document.createElement("input");
  attempts.className = "ruleAttempts";
  attempts.type = "number";
  attempts.min = "1";
  attempts.value = rule.minAttemptsBeforeFullSolution || 4;

  const allow = document.createElement("input");
  allow.className = "ruleAllow";
  allow.type = "checkbox";
  allow.checked = Boolean(rule.allowFullSolution);

  const remove = document.createElement("button");
  remove.className = "danger";
  remove.textContent = "Poista";
  remove.onclick = () => row.remove();

  const cells = [
    ["Tehtävän nimen sisältö", match],
    ["Maksimivihjetaso", level],
    ["Yrityksiä ennen ratkaisua", attempts]
  ];

  cells.forEach(([labelText, control]) => {
    const box = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = labelText;
    box.append(label, control);
    row.appendChild(box);
  });

  const allowBox = document.createElement("label");
  allowBox.className = "check";
  allowBox.append(allow, document.createTextNode(" Salli malliratkaisu"));
  row.append(allowBox, remove);

  $("rules").appendChild(row);
}

$("addRule").onclick = () => addRuleRow();

$("saveConfig").onclick = async () => {
  const projectRules = $$(".ruleRow").map(row => ({
    match: row.querySelector(".ruleMatch").value.trim(),
    maxHintLevel: Number(row.querySelector(".ruleLevel").value),
    allowFullSolution: row.querySelector(".ruleAllow").checked,
    minAttemptsBeforeFullSolution: Number(row.querySelector(".ruleAttempts").value) || 4
  })).filter(rule => rule.match);

  const payload = {
    teacherMessage: $("teacherMessage").value.trim(),
    defaultMaxHintLevel: Number($("defaultMaxHintLevel").value),
    allowFullSolution: $("allowFullSolution").checked,
    minAttemptsBeforeFullSolution: Number($("minAttempts").value) || 4,
    projectRules
  };

  $("saveStatus").textContent = "Tallennetaan…";

  const response = await fetch("/api/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    $("saveStatus").textContent = data.error || "Tallennus epäonnistui.";
    return;
  }

  $("saveStatus").textContent = "Tallennettu ✓";
  await loadPublicConfig();
};

$("load").onclick = async () => {
  try {
    showStatus("Tunnistetaan tehtäviä…");

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoUrl: $("repo").value })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    $("projects").innerHTML = "";

    data.projects.forEach(item => {
      const button = document.createElement("button");
      button.className = "project";

      const solutionText = item.rule.allowFullSolution
        ? "malliratkaisu mahdollinen"
        : "ei valmista ratkaisua";

      button.textContent = `${item.title} • max ${item.rule.maxHintLevel} • ${solutionText}`;

      button.onclick = () => {
        $$(".project").forEach(x => x.classList.remove("selected"));
        button.classList.add("selected");

        project = item;
        maxHintLevel = item.rule.maxHintLevel;

        $("policy").textContent = item.rule.allowFullSolution
          ? `Opettaja sallii malliratkaisun aikaisintaan ${item.rule.minAttemptsBeforeFullSolution}. yrityksellä.`
          : "Opettaja ei salli tässä tehtävässä valmista malliratkaisua.";

        $("title").textContent = item.title;
        $("help").hidden = false;
        resetSession();
      };

      $("projects").appendChild(button);
    });

    $("projectArea").hidden = false;
    clearStatus();
  } catch (error) {
    showStatus(error.message, true);
  }
};

$("ask").onclick = async () => {
  if (!project) return;

  const text = $("msg").value.trim() || "Tarvitsen apua tämän tehtävän kanssa.";

  try {
    showStatus("Haetaan GitHubista uusin koodi ja muodostetaan sopiva vihje…");

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repoUrl: $("repo").value,
        project,
        message: text,
        requestedLevel,
        history
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.demo) {
        throw new Error("GitHub-haku ja opettajan säännöt toimivat. Tekoäly kytketään myöhemmin API-avaimella.");
      }

      throw new Error(data.error);
    }

    $("chat").hidden = false;
    addBubble("student", text, `OPISKELIJA • YRITYS ${history.length + 1}`);
    addBubble("assistant", data.answer, `KOODIOPAS • VIHJE ${data.level}`);

    history.push({ student: text, assistant: data.answer });
    requestedLevel = Math.min(maxHintLevel, requestedLevel + 1);

    $("msg").value = "";
    updateStudentUI();
    clearStatus();
  } catch (error) {
    showStatus(error.message, true);
  }
};

$("reset").onclick = () => {
  resetSession();
  showStatus("Oppimispolku aloitettiin alusta.");
};

loadPublicConfig();
updateStudentUI();
