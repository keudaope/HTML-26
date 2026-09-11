const $=id=>document.getElementById(id), $$=s=>[...document.querySelectorAll(s)];
let groupsData={groups:[]}, coursesData={courses:[]}, session=null, previewData=null;

const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
const uid=()=>crypto.randomUUID();

async function refreshSession(){
  session=await fetch("/api/teacher/session").then(r=>r.json());
  $("loginCard").hidden=session.authenticated;
  $("admin").hidden=!session.authenticated;
  if(!session.authenticated)return;

  $("githubSummary").textContent=
    `${session.githubOrg?` • GitHub-organisaatio: ${session.githubOrg}`:" • GitHub-organisaatiota ei ole vielä asetettu"}`
    + `${session.githubConnected?` • GitHub: @${session.githubLogin}`:""}`;

  await Promise.all([loadGroups(),loadCourses()]);
  updateGithubConnectionUI();
  showView("groups");
}

$("login").onclick=async()=>{
  $("loginStatus").textContent="Kirjaudutaan…";
  const r=await fetch("/api/teacher/login",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({password:$("password").value})
  });
  const d=await r.json();
  if(!r.ok){$("loginStatus").textContent=d.error||"Virhe";return;}
  $("password").value="";
  $("loginStatus").textContent="";
  refreshSession();
};
$("logout").onclick=async()=>{
  await fetch("/api/teacher/logout",{method:"POST"});
  refreshSession();
};

function showView(view){
  const map={
    groups:"groupsView",
    courses:"coursesView",
    github:"githubView",
    distribute:"distributeView"
  };
  for(const [name,id] of Object.entries(map)){
    $(id).hidden=name!==view;
    $(`${name}Tab`)?.classList.toggle("active",name===view);
  }
  if(view==="groups")loadGroups();
  if(view==="courses")loadCourses();
  if(view==="github")loadSettings();
  if(view==="distribute")prepareDistribution();
}
$("groupsTab").onclick=()=>showView("groups");
$("coursesTab").onclick=()=>showView("courses");
$("githubTab").onclick=()=>showView("github");
$("distributeTab").onclick=()=>showView("distribute");

/* GROUPS */
async function loadGroups(){
  groupsData=await fetch("/api/groups").then(r=>r.json());
  renderGroups();
}
function renderGroups(){
  $("groupsEditor").innerHTML="";
  for(const g of groupsData.groups)addGroupCard(g);
}
function addGroupCard(g={id:uid(),name:"",students:[]}){
  const card=document.createElement("div");
  card.className="box groupCard";
  card.dataset.id=g.id;

  card.innerHTML=`
    <div class="between">
      <div class="grow">
        <label>Ryhmän nimi</label>
        <input class="gName" placeholder="esim. Ohjelmistokehittäjät 2026">
      </div>
      <button class="danger removeGroup">Poista ryhmä</button>
    </div>
    <div class="students"></div>
    <button class="secondary addStudent">+ Lisää opiskelija</button>
  `;

  card.querySelector(".gName").value=g.name||"";
  for(const s of g.students||[])addStudentRow(card.querySelector(".students"),s);
  card.querySelector(".addStudent").onclick=()=>addStudentRow(card.querySelector(".students"));
  card.querySelector(".removeGroup").onclick=()=>card.remove();

  $("groupsEditor").append(card);
}
function addStudentRow(container,s={id:"",name:"",githubUsername:""}){
  const row=document.createElement("div");
  row.className="studentRow";
  row.innerHTML=`
    <input class="sId" placeholder="Tunniste">
    <input class="sName" placeholder="Opiskelijan nimi">
    <input class="sGithub" placeholder="GitHub-käyttäjänimi">
    <button class="danger removeStudent">Poista</button>
  `;
  row.querySelector(".sId").value=s.id||"";
  row.querySelector(".sName").value=s.name||"";
  row.querySelector(".sGithub").value=s.githubUsername||"";
  row.querySelector(".removeStudent").onclick=()=>row.remove();
  container.append(row);
}
$("addGroup").onclick=()=>addGroupCard();

$("saveGroups").onclick=async()=>{
  const groups=$$(".groupCard").map(card=>({
    id:card.dataset.id,
    name:card.querySelector(".gName").value.trim(),
    students:[...card.querySelectorAll(".studentRow")].map(row=>({
      id:row.querySelector(".sId").value.trim(),
      name:row.querySelector(".sName").value.trim(),
      githubUsername:row.querySelector(".sGithub").value.trim().replace(/^@/,"")
    })).filter(s=>s.id||s.name||s.githubUsername)
  })).filter(g=>g.name);

  $("groupsStatus").textContent="Tallennetaan…";
  const r=await fetch("/api/groups",{
    method:"PUT",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({groups})
  });
  const d=await r.json();
  $("groupsStatus").textContent=r.ok?"Tallennettu ✓":(d.error||"Virhe");
  if(r.ok)groupsData={groups:d.groups};
};

/* COURSES */
async function loadCourses(){
  [coursesData,groupsData]=await Promise.all([
    fetch("/api/courses").then(r=>r.json()),
    fetch("/api/groups").then(r=>r.json())
  ]);
  renderCourses();
}
function renderCourses(){
  $("coursesEditor").innerHTML="";
  for(const c of coursesData.courses)addCourseCard(c);
}
function addCourseCard(c={id:uid(),name:"",groupIds:[],assignments:[]}){
  const card=document.createElement("div");
  card.className="box courseCard";
  card.dataset.id=c.id;

  card.innerHTML=`
    <div class="between">
      <div class="grow">
        <label>Kurssin nimi</label>
        <input class="cName" placeholder="esim. HTML perusteet">
      </div>
      <button class="danger removeCourse">Poista kurssi</button>
    </div>

    <label>Kurssiin kuuluvat ryhmät</label>
    <div class="courseGroups"></div>

    <div class="between assignmentHeader">
      <h3>Tehtävät</h3>
      <button class="secondary addAssignment">+ Lisää tehtävä</button>
    </div>
    <div class="assignments"></div>
  `;

  card.querySelector(".cName").value=c.name||"";

  const cg=card.querySelector(".courseGroups");
  if(!groupsData.groups.length){
    cg.innerHTML='<p class="muted">Luo ensin vähintään yksi ryhmä Ryhmät-välilehdellä.</p>';
  }else{
    for(const g of groupsData.groups){
      const label=document.createElement("label");
      label.className="check";
      const cb=document.createElement("input");
      cb.type="checkbox";
      cb.value=g.id;
      cb.checked=(c.groupIds||[]).includes(g.id);
      label.append(cb,document.createTextNode(" "+g.name));
      cg.append(label);
    }
  }

  for(const a of c.assignments||[])addAssignmentRow(card.querySelector(".assignments"),a);
  card.querySelector(".addAssignment").onclick=()=>addAssignmentRow(card.querySelector(".assignments"));
  card.querySelector(".removeCourse").onclick=()=>card.remove();
  $("coursesEditor").append(card);
}

function addAssignmentRow(container,a={
  id:uid(),name:"",templateRepoUrl:"",repoPrefix:"",
  instructions:"",maxHintLevel:3,privateRepo:true
}){
  const box=document.createElement("div");
  box.className="assignment";
  box.dataset.id=a.id;

  box.innerHTML=`
    <div class="assignmentGrid">
      <div>
        <label>Tehtävän nimi</label>
        <input class="aName" placeholder="esim. HTML tehtävä 1">
      </div>
      <div>
        <label>Template repository</label>
        <input class="aTemplate" placeholder="https://github.com/organisaatio/html-template">
        <small class="help">GitHub-repository, joka on merkitty Template repositoryksi.</small>
      </div>
      <div>
        <label>Repository-prefix</label>
        <input class="aPrefix" placeholder="html-tehtava-1">
        <small class="help">Esim. html-tehtava-1 → html-tehtava-1-matti01</small>
      </div>
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
    <textarea class="aInstructions" rows="3" placeholder="Kirjoita opiskelijalle näkyvä tehtävänanto..."></textarea>

    <div class="between">
      <label class="check">
        <input class="aPrivate" type="checkbox">
        Luo tämän tehtävän repositoryt yksityisinä
      </label>
      <button class="danger removeAssignment">Poista tehtävä</button>
    </div>
  `;

  box.querySelector(".aName").value=a.name||"";
  box.querySelector(".aTemplate").value=a.templateRepoUrl||"";
  box.querySelector(".aPrefix").value=a.repoPrefix||"";
  box.querySelector(".aLevel").value=a.maxHintLevel||3;
  box.querySelector(".aInstructions").value=a.instructions||"";
  box.querySelector(".aPrivate").checked=a.privateRepo!==false;
  box.querySelector(".removeAssignment").onclick=()=>box.remove();

  container.append(box);
}
$("addCourse").onclick=()=>addCourseCard();

$("saveCourses").onclick=async()=>{
  const courses=$$(".courseCard").map(card=>({
    id:card.dataset.id,
    name:card.querySelector(".cName").value.trim(),
    groupIds:[...card.querySelectorAll(".courseGroups input:checked")].map(x=>x.value),
    assignments:[...card.querySelectorAll(".assignment")].map(box=>({
      id:box.dataset.id,
      name:box.querySelector(".aName").value.trim(),
      templateRepoUrl:box.querySelector(".aTemplate").value.trim(),
      repoPrefix:box.querySelector(".aPrefix").value.trim(),
      instructions:box.querySelector(".aInstructions").value.trim(),
      maxHintLevel:Number(box.querySelector(".aLevel").value),
      privateRepo:box.querySelector(".aPrivate").checked,
      allowFullSolution:Number(box.querySelector(".aLevel").value)===4,
      minAttemptsBeforeFullSolution:4
    })).filter(a=>a.name)
  })).filter(c=>c.name);

  $("coursesStatus").textContent="Tallennetaan…";
  const r=await fetch("/api/courses",{
    method:"PUT",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({courses})
  });
  const d=await r.json();
  $("coursesStatus").textContent=r.ok?"Tallennettu ✓":(d.error||"Virhe");
  if(r.ok)coursesData={courses:d.courses};
};

/* GITHUB SETTINGS */
async function loadSettings(){
  const s=await fetch("/api/settings").then(r=>r.json());
  $("githubOrg").value=s.githubOrg||"";
  $("defaultPrivate").checked=s.defaultRepoPrivate!==false;
  updateGithubConnectionUI();
}
$("saveSettings").onclick=async()=>{
  $("settingsStatus").textContent="Tallennetaan…";
  const r=await fetch("/api/settings",{
    method:"PUT",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      githubOrg:$("githubOrg").value.trim().replace(/^@/,""),
      defaultRepoPrivate:$("defaultPrivate").checked
    })
  });
  const d=await r.json();
  $("settingsStatus").textContent=r.ok?"Tallennettu ✓":(d.error||"Virhe");
  if(r.ok)refreshSession();
};
function updateGithubConnectionUI(){
  if(!session)return;
  if(session.githubConnected){
    $("githubActions").innerHTML='<button id="disconnectGithub" class="secondary">Katkaise GitHub-yhteys</button>';
    $("githubStatus").textContent=`GitHub yhdistetty: @${session.githubLogin}`;
    $("disconnectGithub").onclick=async()=>{
      await fetch("/api/teacher/github/disconnect",{method:"POST"});
      await refreshSession();
      showView("github");
    };
  }else{
    $("githubActions").innerHTML='<a class="buttonLink" href="/auth/github/teacher">Yhdistä GitHub</a>';
    $("githubStatus").textContent="GitHub-tiliä ei ole vielä yhdistetty.";
  }
}

/* DISTRIBUTION */
async function prepareDistribution(){
  [groupsData,coursesData]=await Promise.all([
    fetch("/api/groups").then(r=>r.json()),
    fetch("/api/courses").then(r=>r.json())
  ]);

  $("courseSelect").innerHTML='<option value="">Valitse kurssi</option>'+
    coursesData.courses.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");

  renderDistributionAssignments();
  $("previewCard").hidden=true;
  $("resultCard").hidden=true;
}
function currentDistributionCourse(){
  return coursesData.courses.find(c=>c.id===$("courseSelect").value);
}
function renderDistributionAssignments(){
  const c=currentDistributionCourse();

  $("assignmentSelect").innerHTML='<option value="">Valitse tehtävä</option>'+
    (c?.assignments||[]).map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join("");

  const allowed=new Set(c?.groupIds||[]);
  $("groupSelect").innerHTML='<option value="">Valitse ryhmä</option>'+
    groupsData.groups.filter(g=>allowed.has(g.id)).map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join("");
}
$("courseSelect").onchange=renderDistributionAssignments;

$("preview").onclick=async()=>{
  const body={
    courseId:$("courseSelect").value,
    assignmentId:$("assignmentSelect").value,
    groupId:$("groupSelect").value
  };

  const r=await fetch("/api/distribute/preview",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  const d=await r.json();

  if(!r.ok){
    alert(d.error||"Esikatselu epäonnistui");
    return;
  }

  previewData=d;
  $("previewCard").hidden=false;
  $("resultCard").hidden=true;

  $("previewInfo").textContent=
    `${d.course.name} • ${d.assignment.name} • ${d.group.name} • ${d.private?"yksityiset":"julkiset"} repositoryt`;

  $("previewTable").innerHTML=`
    <table>
      <thead>
        <tr><th>Opiskelija</th><th>GitHub</th><th>Repository</th><th>Valmis jakoon</th></tr>
      </thead>
      <tbody>
        ${d.rows.map(x=>`
          <tr>
            <td>${esc(x.studentName)}</td>
            <td>${x.githubUsername?"@"+esc(x.githubUsername):"—"}</td>
            <td><code>${esc(x.repoUrl)}</code></td>
            <td>${x.valid?"✅":"❌ GitHub-tunnus puuttuu"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
};

$("distribute").onclick=async()=>{
  if(!previewData)return;
  if(!session.githubConnected){
    alert("Yhdistä ensin GitHub kohdassa GitHub-asetukset.");
    return;
  }

  const count=previewData.rows.filter(x=>x.valid).length;
  if(!confirm(`Luodaanko ${count} opiskelijarepositorya GitHubiin?`))return;

  $("distribute").disabled=true;
  $("distribute").textContent="Jaetaan…";

  const r=await fetch("/api/distribute/run",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      courseId:previewData.course.id,
      assignmentId:previewData.assignment.id,
      groupId:previewData.group.id
    })
  });
  const d=await r.json();

  $("distribute").disabled=false;
  $("distribute").textContent="Jaa tehtävä ryhmälle";

  if(!r.ok){
    alert(d.error||"Jako epäonnistui");
    return;
  }

  $("resultCard").hidden=false;

  const label=s=>
    s==="created"?"✅ luotu":
    s==="exists"?"ℹ️ oli jo olemassa":
    s==="created_invite_failed"?"⚠️ repo luotu, kutsu epäonnistui":
    s==="skipped"?"⏭️ ohitettu":
    "❌ epäonnistui";

  $("results").innerHTML=`
    <table>
      <thead><tr><th>Opiskelija</th><th>Tila</th><th>Repository</th><th>Huomio</th></tr></thead>
      <tbody>
        ${d.results.map(x=>`
          <tr>
            <td>${esc(x.student)}</td>
            <td>${label(x.status)}</td>
            <td>${x.repoUrl?`<a href="${esc(x.repoUrl)}" target="_blank" rel="noopener">Avaa</a>`:""}</td>
            <td>${esc(x.error||"")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
};

refreshSession();
