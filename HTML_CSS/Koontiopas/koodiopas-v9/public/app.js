const $ = id => document.getElementById(id);
const $$ = s => [...document.querySelectorAll(s)];

let groupsData = { groups: [] };
let project = null;
let history = [];
let requestedLevel = 1;
let maxHintLevel = 3;

function esc(v){
  return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

function switchMain(view){
  const teacher=view==="teacher";
  $("studentView").hidden=teacher;
  $("teacherView").hidden=!teacher;
  $("studentTab").classList.toggle("active",!teacher);
  $("teacherTab").classList.toggle("active",teacher);
  if(teacher)checkTeacherSession();
}

$("studentTab").onclick=()=>switchMain("student");
$("teacherTab").onclick=()=>switchMain("teacher");

function showTeacherSub(view){
  for(const [name,id] of [["dashboard","dashboardView"],["groups","groupsView"],["settings","settingsView"]]){
    $(id).hidden=name!==view;
    $(`${name}Tab`)?.classList.toggle("active",name===view);
  }
  if(view==="dashboard") loadAnalytics();
  if(view==="groups") loadGroupsEditor();
  if(view==="settings") loadTeacherConfig();
}

$("dashboardTab").onclick=()=>showTeacherSub("dashboard");
$("groupsTab").onclick=()=>showTeacherSub("groups");
$("settingsTab").onclick=()=>showTeacherSub("settings");

function showStatus(text,error=false){
  $("status").hidden=false;
  $("status").textContent=text;
  $("status").className=error?"error":"";
}
function clearStatus(){$("status").hidden=true;}

async function loadPublicConfig(){
  try{
    const r=await fetch("/api/config/public");
    const c=await r.json();
    if(c.teacherMessage){
      $("teacherNotice").textContent=c.teacherMessage;
      $("teacherNotice").hidden=false;
    }else $("teacherNotice").hidden=true;
  }catch{}
}

async function loadPublicGroups(){
  const r=await fetch("/api/groups/public");
  groupsData=await r.json();
  renderStudentGroups();
  renderDashboardFilterGroups();
}

function renderStudentGroups(){
  $("studentGroup").innerHTML='<option value="">Valitse ryhmä</option>';
  groupsData.groups.forEach(g=>{
    const o=document.createElement("option");
    o.value=g.id;o.textContent=g.name;$("studentGroup").append(o);
  });
  renderStudentSelect();
}

function renderStudentSelect(){
  const group=groupsData.groups.find(g=>g.id===$("studentGroup").value);
  $("studentSelect").innerHTML='<option value="">Valitse opiskelija</option>';
  (group?.students||[]).forEach(s=>{
    const o=document.createElement("option");
    o.value=s.id;o.textContent=s.name||s.id;$("studentSelect").append(o);
  });
  updateRepoFromStudent();
}

function updateRepoFromStudent(){
  const group=groupsData.groups.find(g=>g.id===$("studentGroup").value);
  const student=group?.students.find(s=>s.id===$("studentSelect").value);
  if(student?.repoUrl)$("repo").value=student.repoUrl;
}

$("studentGroup").onchange=()=>{renderStudentSelect();resetSession();};
$("studentSelect").onchange=()=>{updateRepoFromStudent();resetSession();};

function updateStudentUI(){
  const effective=Math.min(requestedLevel,maxHintLevel);
  $("level").textContent=`Vihjetaso ${effective}/${maxHintLevel}`;
  $("progress").innerHTML="";
  for(let i=1;i<=maxHintLevel;i++){
    const bar=document.createElement("i");
    if(i<=effective)bar.classList.add("on");
    $("progress").append(bar);
  }
}

function resetSession(){
  history=[];requestedLevel=1;project=null;
  $("messages").innerHTML="";$("chat").hidden=true;$("msg").value="";
  $("projectArea").hidden=true;$("help").hidden=true;
  updateStudentUI();
}

function addBubble(role,text,label){
  const a=document.createElement("article");a.className=role;
  const s=document.createElement("small");s.textContent=label;
  const d=document.createElement("div");d.textContent=text;
  a.append(s,d);$("messages").append(a);
}

$("load").onclick=async()=>{
  try{
    showStatus("Tunnistetaan tehtäviä…");
    const r=await fetch("/api/projects",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({repoUrl:$("repo").value})});
    const d=await r.json();if(!r.ok)throw Error(d.error);
    $("projects").innerHTML="";
    d.projects.forEach(item=>{
      const b=document.createElement("button");b.className="project";
      const solution=item.rule.allowFullSolution?"malliratkaisu mahdollinen":"ei valmista ratkaisua";
      b.textContent=`${item.title} • max ${item.rule.maxHintLevel} • ${solution}`;
      b.onclick=()=>{
        $$(".project").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");
        project=item;maxHintLevel=item.rule.maxHintLevel;
        $("policy").textContent=item.rule.allowFullSolution?`Malliratkaisu mahdollinen aikaisintaan ${item.rule.minAttemptsBeforeFullSolution}. yrityksellä.`:"Opettaja ei salli valmista malliratkaisua.";
        $("title").textContent=item.title;$("help").hidden=false;
        history=[];requestedLevel=1;updateStudentUI();
      };
      $("projects").append(b);
    });
    $("projectArea").hidden=false;clearStatus();
  }catch(e){showStatus(e.message,true);}
};

$("ask").onclick=async()=>{
  if(!project)return;
  const text=$("msg").value.trim()||"Tarvitsen apua.";
  const group=groupsData.groups.find(g=>g.id===$("studentGroup").value);
  const student=group?.students.find(s=>s.id===$("studentSelect").value);

  try{
    showStatus("Haetaan GitHubista uusin koodi ja muodostetaan vihje…");
    const r=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      repoUrl:$("repo").value,project,message:text,requestedLevel,history,
      studentId:student?.id||"Anonyymi",studentName:student?.name||"",
      groupId:group?.id||"",groupName:group?.name||""
    })});
    const d=await r.json();

    if(!r.ok){
      if(d.demo)throw Error("GitHub-haku, ryhmäkohdistus ja analytiikka toimivat. Tekoäly kytketään myöhemmin API-avaimella.");
      throw Error(d.error);
    }

    $("chat").hidden=false;
    addBubble("student",text,`OPISKELIJA • YRITYS ${history.length+1}`);
    addBubble("assistant",d.answer,`KOODIOPAS • VIHJE ${d.level}`);
    history.push({student:text,assistant:d.answer});
    requestedLevel=Math.min(maxHintLevel,requestedLevel+1);
    $("msg").value="";updateStudentUI();clearStatus();
  }catch(e){showStatus(e.message,true);}
};

$("reset").onclick=()=>{history=[];requestedLevel=1;$("messages").innerHTML="";$("chat").hidden=true;$("msg").value="";updateStudentUI();};

async function checkTeacherSession(){
  const r=await fetch("/api/teacher/session");const d=await r.json();
  $("teacherLoginCard").hidden=d.authenticated;
  $("teacherAdmin").hidden=!d.authenticated;
  if(d.authenticated){await loadPublicGroups();showTeacherSub("dashboard");}
}

$("teacherLogin").onclick=async()=>{
  $("loginStatus").textContent="Kirjaudutaan…";
  const r=await fetch("/api/teacher/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:$("teacherPassword").value})});
  const d=await r.json();
  if(!r.ok){$("loginStatus").textContent=d.error||"Virhe";return;}
  $("teacherPassword").value="";$("loginStatus").textContent="";checkTeacherSession();
};

$("teacherLogout").onclick=async()=>{await fetch("/api/teacher/logout",{method:"POST"});checkTeacherSession();};

function renderDashboardFilterGroups(){
  $("filterGroup").innerHTML='<option value="">Kaikki ryhmät</option>';
  groupsData.groups.forEach(g=>{
    const o=document.createElement("option");o.value=g.id;o.textContent=g.name;$("filterGroup").append(o);
  });
  renderDashboardFilterStudents();
}

function renderDashboardFilterStudents(){
  $("filterStudent").innerHTML='<option value="">Kaikki opiskelijat</option>';
  const groupId=$("filterGroup").value;
  const students=groupId?groupsData.groups.find(g=>g.id===groupId)?.students||[]:groupsData.groups.flatMap(g=>g.students);
  students.forEach(s=>{
    if([...$("filterStudent").options].some(o=>o.value===s.id))return;
    const o=document.createElement("option");o.value=s.id;o.textContent=s.name||s.id;$("filterStudent").append(o);
  });
}
$("filterGroup").onchange=renderDashboardFilterStudents;

async function loadAnalytics(){
  const params=new URLSearchParams();
  for(const [id,key] of [["filterGroup","groupId"],["filterStudent","studentId"],["filterProject","project"],["filterFrom","from"],["filterTo","to"]]){
    if($(id).value)params.set(key,$(id).value);
  }
  const r=await fetch("/api/analytics?"+params.toString());
  if(r.status===401)return checkTeacherSession();
  const d=await r.json();

  $("statAttempts").textContent=d.totalAttempts;
  $("statStudents").textContent=d.uniqueStudents;
  $("statProjects").textContent=d.projects.length;
  $("statHighHints").textContent=(d.hintLevels["3"]||0)+(d.hintLevels["4"]||0);

  $("filterProject").innerHTML='<option value="">Kaikki tehtävät</option>'+d.projects.map(x=>`<option value="${esc(x.project)}">${esc(x.project)}</option>`).join("");

  $("projectTable").innerHTML=d.projects.length?`
  <table><thead><tr><th>Tehtävä</th><th>Avunpyyntöjä</th><th>Opiskelijoita</th><th>Korkein vihjetaso</th></tr></thead>
  <tbody>${d.projects.map(x=>`<tr><td>${esc(x.project)}</td><td>${x.attempts}</td><td>${x.uniqueStudents}</td><td>${x.maxHintLevelReached}</td></tr>`).join("")}</tbody></table>`:'<p class="muted">Ei tietoja.</p>';

  $("themeList").innerHTML=d.themes.length?d.themes.map(x=>`<div class="barRow"><div><strong>${esc(x.theme)}</strong><span>${x.count}</span></div><div class="bar"><i style="width:${d.totalAttempts?Math.round(x.count/d.totalAttempts*100):0}%"></i></div></div>`).join(""):'<p class="muted">Ei tietoja.</p>';

  $("hintBars").innerHTML=[1,2,3,4].map(n=>{const c=d.hintLevels[String(n)]||0;return `<div class="barRow"><div><strong>Vihjetaso ${n}</strong><span>${c}</span></div><div class="bar"><i style="width:${d.totalAttempts?Math.round(c/d.totalAttempts*100):0}%"></i></div></div>`}).join("");

  $("recentTable").innerHTML=d.recent.length?`
  <table><thead><tr><th>Aika</th><th>Ryhmä</th><th>Opiskelija</th><th>Tehtävä</th><th>Taso</th><th>Teema</th></tr></thead>
  <tbody>${d.recent.map(x=>`<tr><td>${new Date(x.timestamp).toLocaleString("fi-FI")}</td><td>${esc(x.groupName)}</td><td>${esc(x.studentName||x.studentId)}</td><td>${esc(x.project)}</td><td>${x.level}</td><td>${esc(x.theme)}</td></tr>`).join("")}</tbody></table>`:'<p class="muted">Ei tietoja.</p>';
}

$("applyFilters").onclick=loadAnalytics;
$("clearFilters").onclick=()=>{
  for(const id of ["filterGroup","filterStudent","filterProject","filterFrom","filterTo"])$(id).value="";
  renderDashboardFilterStudents();loadAnalytics();
};

async function loadGroupsEditor(){
  const r=await fetch("/api/groups");
  if(r.status===401)return checkTeacherSession();
  groupsData=await r.json();
  renderGroupsEditor();
}

function renderGroupsEditor(){
  $("groupsEditor").innerHTML="";
  groupsData.groups.forEach(g=>addGroupCard(g));
}

function addGroupCard(group={id:crypto.randomUUID(),name:"",students:[]}){
  const card=document.createElement("div");card.className="groupCard";
  card.dataset.id=group.id||crypto.randomUUID();
  card.innerHTML=`
    <div class="between"><div class="grow"><label>Ryhmän nimi</label><input class="groupName"></div><button class="danger removeGroup">Poista ryhmä</button></div>
    <div class="studentsList"></div>
    <button class="secondary addStudent">+ Lisää opiskelija</button>`;
  card.querySelector(".groupName").value=group.name||"";
  card.querySelector(".removeGroup").onclick=()=>card.remove();
  card.querySelector(".addStudent").onclick=()=>addStudentRow(card.querySelector(".studentsList"));
  (group.students||[]).forEach(s=>addStudentRow(card.querySelector(".studentsList"),s));
  $("groupsEditor").append(card);
}

function addStudentRow(container,student={id:"",name:"",repoUrl:""}){
  const row=document.createElement("div");row.className="studentRow";
  row.innerHTML=`
    <input class="studentCode" placeholder="Tunniste">
    <input class="studentName" placeholder="Nimi">
    <input class="studentRepo" placeholder="GitHub repository">
    <button class="danger removeStudent">Poista</button>`;
  row.querySelector(".studentCode").value=student.id||"";
  row.querySelector(".studentName").value=student.name||"";
  row.querySelector(".studentRepo").value=student.repoUrl||"";
  row.querySelector(".removeStudent").onclick=()=>row.remove();
  container.append(row);
}

$("addGroup").onclick=()=>addGroupCard();

$("saveGroups").onclick=async()=>{
  const groups=$$(".groupCard").map(card=>({
    id:card.dataset.id,
    name:card.querySelector(".groupName").value.trim(),
    students:[...card.querySelectorAll(".studentRow")].map(row=>({
      id:row.querySelector(".studentCode").value.trim(),
      name:row.querySelector(".studentName").value.trim(),
      repoUrl:row.querySelector(".studentRepo").value.trim()
    })).filter(s=>s.id||s.name)
  })).filter(g=>g.name);

  $("groupsSaveStatus").textContent="Tallennetaan…";
  const r=await fetch("/api/groups",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({groups})});
  const d=await r.json();
  $("groupsSaveStatus").textContent=r.ok?"Tallennettu ✓":(d.error||"Virhe");
  if(r.ok){groupsData={groups:d.groups};await loadPublicGroups();}
};

async function loadTeacherConfig(){
  const r=await fetch("/api/config");if(r.status===401)return checkTeacherSession();
  const c=await r.json();
  $("teacherMessage").value=c.teacherMessage||"";
  $("defaultMaxHintLevel").value=c.defaultMaxHintLevel||3;
  $("allowFullSolution").checked=Boolean(c.allowFullSolution);
  $("minAttempts").value=c.minAttemptsBeforeFullSolution||4;
  renderRules(c.projectRules||[]);
}

function renderRules(rules){$("rules").innerHTML="";rules.forEach(r=>addRuleRow(r));}
function addRuleRow(rule={}){
  const row=document.createElement("div");row.className="ruleRow";
  row.innerHTML=`
    <div><label>Tehtävän nimen sisältö</label><input class="ruleMatch"></div>
    <div><label>Maksimivihjetaso</label><select class="ruleLevel"><option>1</option><option>2</option><option>3</option><option>4</option></select></div>
    <div><label>Yrityksiä ennen ratkaisua</label><input class="ruleAttempts" type="number" min="1"></div>
    <label class="check"><input class="ruleAllow" type="checkbox"> Salli malliratkaisu</label>
    <button class="danger removeRule">Poista</button>`;
  row.querySelector(".ruleMatch").value=rule.match||"";
  row.querySelector(".ruleLevel").value=rule.maxHintLevel||3;
  row.querySelector(".ruleAttempts").value=rule.minAttemptsBeforeFullSolution||4;
  row.querySelector(".ruleAllow").checked=Boolean(rule.allowFullSolution);
  row.querySelector(".removeRule").onclick=()=>row.remove();
  $("rules").append(row);
}
$("addRule").onclick=()=>addRuleRow();

$("saveConfig").onclick=async()=>{
  const projectRules=$$(".ruleRow").map(row=>({
    match:row.querySelector(".ruleMatch").value.trim(),
    maxHintLevel:Number(row.querySelector(".ruleLevel").value),
    allowFullSolution:row.querySelector(".ruleAllow").checked,
    minAttemptsBeforeFullSolution:Number(row.querySelector(".ruleAttempts").value)||4
  })).filter(r=>r.match);

  const payload={
    teacherMessage:$("teacherMessage").value.trim(),
    defaultMaxHintLevel:Number($("defaultMaxHintLevel").value),
    allowFullSolution:$("allowFullSolution").checked,
    minAttemptsBeforeFullSolution:Number($("minAttempts").value)||4,
    projectRules
  };

  $("saveStatus").textContent="Tallennetaan…";
  const r=await fetch("/api/config",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  const d=await r.json();
  $("saveStatus").textContent=r.ok?"Tallennettu ✓":(d.error||"Virhe");
  if(r.ok)loadPublicConfig();
};

loadPublicConfig();
loadPublicGroups();
updateStudentUI();
showTeacherSub("dashboard");
