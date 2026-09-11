const $ = id => document.getElementById(id);
const $$ = selector => [...document.querySelectorAll(selector)];

let project = null;
let history = [];
let requestedLevel = 1;
let maxHintLevel = 3;
let currentConfig = null;

function switchView(view) {
  const teacher = view === "teacher";
  $("studentView").hidden = teacher;
  $("teacherView").hidden = !teacher;
  $("studentTab").classList.toggle("active", !teacher);
  $("teacherTab").classList.toggle("active", teacher);
}

$("studentTab").onclick = () => switchView("student");
$("teacherTab").onclick = () => {
  switchView("teacher");
  loadTeacherConfig();
};

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

async function loadTeacherConfig() {
  const response = await fetch("/api/config");
  currentConfig = await response.json();

  $("teacherMessage").value = currentConfig.teacherMessage || "";
  $("defaultMaxHintLevel").value = currentConfig.defaultMaxHintLevel || 3;
  $("allowFullSolution").checked = Boolean(currentConfig.allowFullSolution);
  $("minAttempts").value = currentConfig.minAttemptsBeforeFullSolution || 4;

  renderRules(currentConfig.projectRules || []);

  if (currentConfig.teacherMessage) {
    $("teacherNotice").textContent = currentConfig.teacherMessage;
    $("teacherNotice").hidden = false;
  } else {
    $("teacherNotice").hidden = true;
  }
}

function renderRules(rules) {
  $("rules").innerHTML = "";
  rules.forEach(rule => addRuleRow(rule));
}

function addRuleRow(rule = {}) {
  const row = document.createElement("div");
  row.className = "ruleRow";

  row.innerHTML = `
    <div>
      <label>Tehtävän nimen sisältö</label>
      <input class="ruleMatch" value="${escapeHtml(rule.match || "")}" placeholder="Esim. Projekti 1A">
    </div>
    <div>
      <label>Maksimivihjetaso</label>
      <select class="ruleLevel">
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
      </select>
    </div>
    <div>
      <label>Yrityksiä ennen ratkaisua</label>
      <input class="ruleAttempts" type="number" min="1" value="${Number(rule.minAttemptsBeforeFullSolution || 4)}">
    </div>
    <div class="ruleCheck">
      <label class="check">
        <input class="ruleAllow" type="checkbox">
        Salli malliratkaisu
      </label>
    </div>
    <button class="danger removeRule" type="button">Poista</button>
  `;

  row.querySelector(".ruleLevel").value = rule.maxHintLevel || 3;
  row.querySelector(".ruleAllow").checked = Boolean(rule.allowFullSolution);
  row.querySelector(".removeRule").onclick = () => row.remove();

  $("rules").appendChild(row);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

  try {
    const response = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Tallennus epäonnistui.");

    $("saveStatus").textContent = "Tallennettu ✓";
    currentConfig = data.config;
    await loadTeacherConfig();
  } catch (error) {
    $("saveStatus").textContent = error.message;
  }
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

loadTeacherConfig();
updateStudentUI();
