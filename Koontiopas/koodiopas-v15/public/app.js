
const $=id=>document.getElementById(id);
let workspace=null,history=[],requestedLevel=1,maxHintLevel=3;
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");

function switchMain(view){
  const teacher=view==="teacher";
  $("studentView").hidden=teacher;$("teacherView").hidden=!teacher;
  $("studentTab").classList.toggle("active",!teacher);$("teacherTab").classList.toggle("active",teacher);
  if(teacher)checkTeacherSession();
}
$("studentTab").onclick=()=>switchMain("student");$("teacherTab").onclick=()=>switchMain("teacher");

async function loadStudentSession(){
  const d=await fetch("/api/student/session").then(r=>r.json());
  $("studentLoggedOut").hidden=d.authenticated;$("studentLoggedIn").hidden=!d.authenticated;
  if(!d.authenticated)return;
  $("studentAvatar").src=d.githubUser.avatarUrl||"";$("studentAvatar").hidden=!d.githubUser.avatarUrl;
  $("studentName").textContent=d.student?.name||d.githubUser.name||d.githubUser.login;
  $("studentGithub").textContent=`GitHub: @${d.githubUser.login}${d.group?` • ${d.group.name}`:""}`;
  $("studentUnmatched").hidden=d.matched;$("studentWorkspace").hidden=!d.matched;
  if(d.matched)loadWorkspace();
}
async function loadWorkspace(){
  workspace=await fetch("/api/student/workspace").then(r=>r.json());
  $("studentCourse").innerHTML='<option value="">Valitse kurssi</option>'+workspace.courses.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
  renderAssignments();
}
function currentCourse(){return workspace?.courses.find(c=>c.id===$("studentCourse").value);}
function currentAssignment(){return currentCourse()?.assignments.find(a=>a.id===$("studentAssignment").value);}
function renderAssignments(){
  const c=currentCourse();
  $("studentAssignment").innerHTML='<option value="">Valitse tehtävä</option>'+((c?.assignments||[]).map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join(""));
  updateAssignment();
}
function updateAssignment(){
  const c=currentCourse(),a=currentAssignment(); resetHelpState();
  if(!c||!a){$("assignmentInfo").hidden=true;$("studentRepo").value="";$("openRepo").removeAttribute("href");$("helpArea").hidden=true;return;}
  $("assignmentInfo").hidden=false;$("assignmentInfo").innerHTML=`<strong>${esc(a.name)}</strong><p>${esc(a.instructions||"")}</p>`;
  $("studentRepo").value=a.repoUrl||"";$("openRepo").href=a.repoUrl||"#";maxHintLevel=Number(a.maxHintLevel||3);$("helpArea").hidden=!a.repoUrl;updateHintUI();
}
$("studentCourse").onchange=renderAssignments;$("studentAssignment").onchange=updateAssignment;

function resetHelpState(){history=[];requestedLevel=1;$("messages").innerHTML="";$("chatCard").hidden=true;$("studentMessage").value="";$("studentStatus").textContent="";updateHintUI();}
function updateHintUI(){
  const level=Math.min(requestedLevel,maxHintLevel);$("hintLevel").textContent=`Vihjetaso ${level}/${maxHintLevel}`;$("hintProgress").innerHTML="";
  for(let i=1;i<=maxHintLevel;i++){const dot=document.createElement("i");if(i<=level)dot.classList.add("on");$("hintProgress").append(dot);}
}
function addBubble(role,text,label){
  const a=document.createElement("article");a.className=role;
  const s=document.createElement("small");s.textContent=label;
  const d=document.createElement("div");d.textContent=text;a.append(s,d);$("messages").append(a);
}
$("askHint").onclick=async()=>{
  const c=currentCourse(),a=currentAssignment();if(!c||!a)return;
  const text=$("studentMessage").value.trim()||"Tarvitsen apua.";$("studentStatus").textContent="Luetaan repositoryn uusin koodi ja muodostetaan vihje…";
  const r=await fetch("/api/student/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({courseId:c.id,assignmentId:a.id,message:text,requestedLevel,history})});
  const d=await r.json();
  if(!r.ok){$("studentStatus").textContent=d.error||"Analyysi epäonnistui.";return;}
  $("chatCard").hidden=false;$("chatTitle").textContent=`${c.name} • ${a.name}`;
  addBubble("student",text,`OPISKELIJA • YRITYS ${history.length+1}`);
  addBubble("assistant",d.answer,`KOODIOPAS • VIHJE ${d.level}`);
  history.push({student:text,assistant:d.answer});requestedLevel=Math.min(maxHintLevel,requestedLevel+1);
  $("studentMessage").value="";$("studentStatus").textContent=`Analysoitu ${d.files?.length||0} tiedostoa.`;updateHintUI();
};
$("resetHelp").onclick=resetHelpState;
$("studentLogout").onclick=async()=>{await fetch("/api/student/logout",{method:"POST"});location.reload();};

async function checkTeacherSession(){
  const d=await fetch("/api/teacher/session").then(r=>r.json());
  $("teacherLoginCard").hidden=d.authenticated;$("teacherAdmin").hidden=!d.authenticated;
  if(d.authenticated)showTeacherView("history");
}
$("teacherLogin").onclick=async()=>{
  $("teacherLoginStatus").textContent="Kirjaudutaan…";
  const r=await fetch("/api/teacher/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:$("teacherPassword").value})});
  const d=await r.json();if(!r.ok){$("teacherLoginStatus").textContent=d.error||"Virhe";return;}
  $("teacherPassword").value="";$("teacherLoginStatus").textContent="";checkTeacherSession();
};
$("teacherLogout").onclick=async()=>{await fetch("/api/teacher/logout",{method:"POST"});checkTeacherSession();};
$("refreshHistory").onclick=loadHistory;

async function loadHistory(){
  const d=await fetch("/api/teacher/distributions").then(r=>r.json());const items=(d.distributions||[]).slice().reverse();
  $("historyList").innerHTML=items.length?items.map(dist=>`
  <div class="historyItem"><div class="between"><div><strong>${esc(dist.courseName||"")}</strong> • ${esc(dist.assignmentName||"")}<div class="muted">${esc(dist.groupName||"")} • ${new Date(dist.timestamp).toLocaleString("fi-FI")}</div></div><span>${esc(dist.organization||"")}</span></div>
  <table><thead><tr><th>Opiskelija</th><th>Tila</th><th>Repository</th><th>Huomio</th></tr></thead><tbody>
  ${(dist.results||[]).map(x=>`<tr><td>${esc(x.student)}</td><td>${statusLabel(x.status)}</td><td>${x.repoUrl?`<a href="${esc(x.repoUrl)}" target="_blank" rel="noopener">Avaa</a>`:""}</td><td>${esc(x.error||"")}</td></tr>`).join("")}
  </tbody></table></div>`).join(""):'<p class="muted">Jakohistoriaa ei ole vielä.</p>';
}
function statusLabel(s){return s==="created"?"✅ luotu":s==="exists"?"ℹ️ oli jo olemassa":s==="created_invite_failed"?"⚠️ kutsu epäonnistui":s==="skipped"?"⏭️ ohitettu":"❌ epäonnistui";}

async function loadAnalytics(){
  const d=await fetch("/api/teacher/analytics").then(r=>r.json());
  $("totalAttempts").textContent=d.totalAttempts||0;$("studentCount").textContent=d.students?.length||0;$("highLevelCount").textContent=d.highLevelAttempts||0;
  $("studentAnalytics").innerHTML=d.students?.length?`<table><thead><tr><th>Opiskelija</th><th>Ryhmä</th><th>Avunpyyntöjä</th><th>Korkein taso</th><th>Tehtäviä</th><th>Viimeisin</th></tr></thead><tbody>
  ${d.students.map(s=>`<tr><td>${esc(s.studentName||s.githubUsername)}<div class="muted">@${esc(s.githubUsername||"")}</div></td><td>${esc(s.groupName||"")}</td><td>${s.attempts}</td><td>${s.maxLevel}</td><td>${esc((s.assignments||[]).join(", "))}</td><td>${s.lastAt?new Date(s.lastAt).toLocaleString("fi-FI"):""}</td></tr>`).join("")}
  </tbody></table>`:'<p class="muted">Ei vielä analytiikkaa.</p>';
  $("recentAnalytics").innerHTML=d.recent?.length?`<table><thead><tr><th>Aika</th><th>Opiskelija</th><th>Tehtävä</th><th>Taso</th><th>Viesti</th></tr></thead><tbody>
  ${d.recent.map(e=>`<tr><td>${new Date(e.timestamp).toLocaleString("fi-FI")}</td><td>${esc(e.studentName||e.githubUsername)}</td><td>${esc(e.assignmentName||"")}</td><td>${e.level}</td><td>${esc(e.message||"")}</td></tr>`).join("")}
  </tbody></table>`:'<p class="muted">Ei vielä tapahtumia.</p>';
}
loadStudentSession();


/* V15 täydellinen opettajan hallinta */
let groupsData={groups:[]},coursesData={courses:[]},teacherGithub=null,previewData=null;
const uid=()=>crypto.randomUUID();

function showTeacherView(view){
  const views=["groups","courses","github","distribute","history","analytics"];
  for(const name of views){
    const el=$(`${name}View`); if(el)el.hidden=name!==view;
    const tab=$(`${name}Tab`); if(tab)tab.classList.toggle("active",name===view);
  }
  if(view==="groups")loadGroupsAdmin();
  if(view==="courses")loadCoursesAdmin();
  if(view==="github")loadGithubAdmin();
  if(view==="distribute")prepareDistribution();
  if(view==="history")loadHistory();
  if(view==="analytics")loadAnalytics();
}
$("groupsTab").onclick=()=>showTeacherView("groups");
$("coursesTab").onclick=()=>showTeacherView("courses");
$("githubTab").onclick=()=>showTeacherView("github");
$("distributeTab").onclick=()=>showTeacherView("distribute");
$("historyTab").onclick=()=>showTeacherView("history");
$("analyticsTab").onclick=()=>showTeacherView("analytics");

async function loadGroupsAdmin(){
  groupsData=await fetch("/api/groups").then(r=>r.json());
  $("groupsEditor").innerHTML="";
  for(const g of groupsData.groups)addGroupCard(g);
}
function addGroupCard(g={id:uid(),name:"",students:[]}){
  const card=document.createElement("div");card.className="historyItem groupCard";card.dataset.id=g.id;
  card.innerHTML=`<div class="between"><input class="gName" placeholder="Ryhmän nimi"><button class="secondary removeGroup">Poista ryhmä</button></div><div class="students"></div><button class="secondary addStudent">+ Lisää opiskelija</button>`;
  card.querySelector(".gName").value=g.name||"";
  for(const st of g.students||[])addStudentRow(card.querySelector(".students"),st);
  card.querySelector(".addStudent").onclick=()=>addStudentRow(card.querySelector(".students"));
  card.querySelector(".removeGroup").onclick=()=>card.remove();
  $("groupsEditor").append(card);
}
function addStudentRow(container,st={id:"",name:"",githubUsername:""}){
  const row=document.createElement("div");row.className="studentRow";
  row.innerHTML=`<input class="sId" placeholder="Tunniste"><input class="sName" placeholder="Opiskelijan nimi"><input class="sGithub" placeholder="GitHub-käyttäjänimi"><button class="secondary removeStudent">Poista</button>`;
  row.querySelector(".sId").value=st.id||"";row.querySelector(".sName").value=st.name||"";row.querySelector(".sGithub").value=st.githubUsername||"";
  row.querySelector(".removeStudent").onclick=()=>row.remove();container.append(row);
}
$("addGroup").onclick=()=>addGroupCard();
$("saveGroups").onclick=async()=>{
  const groups=[...document.querySelectorAll(".groupCard")].map(card=>({
    id:card.dataset.id,name:card.querySelector(".gName").value.trim(),
    students:[...card.querySelectorAll(".studentRow")].map(row=>({
      id:row.querySelector(".sId").value.trim(),name:row.querySelector(".sName").value.trim(),githubUsername:row.querySelector(".sGithub").value.trim().replace(/^@/,"")
    })).filter(x=>x.id||x.name||x.githubUsername)
  })).filter(x=>x.name);
  const r=await fetch("/api/groups",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({groups})});
  const d=await r.json();$("groupsStatus").textContent=r.ok?"Tallennettu ✓":d.error;
};

async function loadCoursesAdmin(){
  [coursesData,groupsData]=await Promise.all([fetch("/api/courses").then(r=>r.json()),fetch("/api/groups").then(r=>r.json())]);
  $("coursesEditor").innerHTML="";
  for(const c of coursesData.courses)addCourseCard(c);
}
function addCourseCard(c={id:uid(),name:"",groupIds:[],assignments:[]}){
  const card=document.createElement("div");card.className="historyItem courseCard";card.dataset.id=c.id;
  card.innerHTML=`<div class="between"><input class="cName" placeholder="Kurssin nimi"><button class="secondary removeCourse">Poista kurssi</button></div><label>Kurssiin kuuluvat ryhmät</label><div class="courseGroups"></div><div class="between"><h3>Tehtävät</h3><button class="secondary addAssignment">+ Lisää tehtävä</button></div><div class="assignments"></div>`;
  card.querySelector(".cName").value=c.name||"";
  const cg=card.querySelector(".courseGroups");
  for(const g of groupsData.groups){
    const l=document.createElement("label");l.className="check";const cb=document.createElement("input");cb.type="checkbox";cb.value=g.id;cb.checked=(c.groupIds||[]).includes(g.id);l.append(cb,document.createTextNode(" "+g.name));cg.append(l);
  }
  for(const a of c.assignments||[])addAssignmentRow(card.querySelector(".assignments"),a);
  card.querySelector(".addAssignment").onclick=()=>addAssignmentRow(card.querySelector(".assignments"));
  card.querySelector(".removeCourse").onclick=()=>card.remove();$("coursesEditor").append(card);
}
function addAssignmentRow(container,a={id:uid(),name:"",templateRepoUrl:"",repoPrefix:"",instructions:"",maxHintLevel:3,privateRepo:true,allowFullSolution:false,minAttemptsBeforeFullSolution:4}){
  const box=document.createElement("div");box.className="notice assignment";box.dataset.id=a.id;
  box.innerHTML=`<div class="assignmentGrid"><input class="aName" placeholder="Tehtävän nimi"><input class="aTemplate" placeholder="Template repository URL"><input class="aPrefix" placeholder="Repository-prefix"><select class="aLevel"><option value="1">1 – pieni vihje</option><option value="2">2 – tarkempi vihje</option><option value="3">3 – rinnakkainen esimerkki</option><option value="4">4 – malliratkaisu mahdollinen</option></select></div><textarea class="aInstructions" rows="3" placeholder="Tehtävänanto"></textarea><div class="between"><label class="check"><input class="aPrivate" type="checkbox"> Yksityinen repository</label><button class="secondary removeAssignment">Poista tehtävä</button></div>`;
  box.querySelector(".aName").value=a.name||"";box.querySelector(".aTemplate").value=a.templateRepoUrl||"";box.querySelector(".aPrefix").value=a.repoPrefix||"";box.querySelector(".aLevel").value=a.maxHintLevel||3;box.querySelector(".aInstructions").value=a.instructions||"";box.querySelector(".aPrivate").checked=a.privateRepo!==false;
  box.querySelector(".removeAssignment").onclick=()=>box.remove();container.append(box);
}
$("addCourse").onclick=()=>addCourseCard();
$("saveCourses").onclick=async()=>{
  const courses=[...document.querySelectorAll(".courseCard")].map(card=>({
    id:card.dataset.id,name:card.querySelector(".cName").value.trim(),groupIds:[...card.querySelectorAll(".courseGroups input:checked")].map(x=>x.value),
    assignments:[...card.querySelectorAll(".assignment")].map(box=>({
      id:box.dataset.id,name:box.querySelector(".aName").value.trim(),templateRepoUrl:box.querySelector(".aTemplate").value.trim(),repoPrefix:box.querySelector(".aPrefix").value.trim(),
      instructions:box.querySelector(".aInstructions").value.trim(),maxHintLevel:Number(box.querySelector(".aLevel").value),privateRepo:box.querySelector(".aPrivate").checked,
      allowFullSolution:Number(box.querySelector(".aLevel").value)===4,minAttemptsBeforeFullSolution:4
    })).filter(x=>x.name)
  })).filter(x=>x.name);
  const r=await fetch("/api/courses",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({courses})});const d=await r.json();$("coursesStatus").textContent=r.ok?"Tallennettu ✓":d.error;
};

async function loadGithubAdmin(){
  const [st,gh]=await Promise.all([fetch("/api/settings").then(r=>r.json()),fetch("/api/teacher/github/session").then(r=>r.json())]);
  teacherGithub=gh;$("githubOrg").value=st.githubOrg||"";$("defaultPrivate").checked=st.defaultRepoPrivate!==false;
  if(gh.connected){$("githubStatus").textContent=`GitHub yhdistetty: @${gh.login}`;$("githubActions").innerHTML='<button id="disconnectGithub" class="secondary">Katkaise GitHub-yhteys</button>';$("disconnectGithub").onclick=async()=>{await fetch("/api/teacher/github/disconnect",{method:"POST"});loadGithubAdmin();};}
  else{$("githubStatus").textContent="GitHub-yhteyttä ei ole.";$("githubActions").innerHTML='<a class="buttonLink" href="/auth/github/teacher">Yhdistä GitHub</a>';}
}
$("saveSettings").onclick=async()=>{
  const r=await fetch("/api/settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({githubOrg:$("githubOrg").value.trim(),defaultRepoPrivate:$("defaultPrivate").checked})});const d=await r.json();$("settingsStatus").textContent=r.ok?"Tallennettu ✓":d.error;
};

async function prepareDistribution(){
  [groupsData,coursesData]=await Promise.all([fetch("/api/groups").then(r=>r.json()),fetch("/api/courses").then(r=>r.json())]);
  $("courseSelect").innerHTML='<option value="">Valitse kurssi</option>'+coursesData.courses.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
  renderDistributionChoices();$("previewCard").hidden=true;$("resultCard").hidden=true;
}
function renderDistributionChoices(){
  const c=coursesData.courses.find(x=>x.id===$("courseSelect").value);
  $("assignmentSelect").innerHTML='<option value="">Valitse tehtävä</option>'+((c?.assignments||[]).map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join(""));
  const ids=new Set(c?.groupIds||[]);
  $("groupSelect").innerHTML='<option value="">Valitse ryhmä</option>'+groupsData.groups.filter(g=>ids.has(g.id)).map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join("");
}
$("courseSelect").onchange=renderDistributionChoices;
$("preview").onclick=async()=>{
  const body={courseId:$("courseSelect").value,assignmentId:$("assignmentSelect").value,groupId:$("groupSelect").value};
  const r=await fetch("/api/distribute/preview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json();
  if(!r.ok){alert(d.error);return;}previewData=d;$("previewCard").hidden=false;$("resultCard").hidden=true;
  $("previewInfo").textContent=`${d.course.name} • ${d.assignment.name} • ${d.group.name} • ${d.private?"yksityiset":"julkiset"} repositoryt`;
  $("previewTable").innerHTML=`<table><thead><tr><th>Opiskelija</th><th>GitHub</th><th>Repository</th><th>Valmis</th></tr></thead><tbody>${d.rows.map(x=>`<tr><td>${esc(x.studentName)}</td><td>${x.githubUsername?"@"+esc(x.githubUsername):"—"}</td><td>${esc(x.repoUrl)}</td><td>${x.valid?"✅":"❌"}</td></tr>`).join("")}</tbody></table>`;
};
$("distribute").onclick=async()=>{
  if(!previewData)return;if(!confirm(`Luodaanko ${previewData.rows.filter(x=>x.valid).length} repositorya?`))return;
  const r=await fetch("/api/distribute/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({courseId:previewData.course.id,assignmentId:previewData.assignment.id,groupId:previewData.group.id})});const d=await r.json();
  if(!r.ok){alert(d.error);return;}$("resultCard").hidden=false;$("results").innerHTML=`<table><thead><tr><th>Opiskelija</th><th>Tila</th><th>Repository</th><th>Huomio</th></tr></thead><tbody>${d.results.map(x=>`<tr><td>${esc(x.student)}</td><td>${statusLabel(x.status)}</td><td>${x.repoUrl?`<a href="${esc(x.repoUrl)}" target="_blank">Avaa</a>`:""}</td><td>${esc(x.error||"")}</td></tr>`).join("")}</tbody></table>`;
};
