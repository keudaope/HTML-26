const $=id=>document.getElementById(id);
let groups={groups:[]},courses={courses:[]},session=null,previewData=null;
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");

async function refreshSession(){
  session=await fetch("/api/teacher/session").then(r=>r.json());
  $("loginCard").hidden=session.authenticated;$("admin").hidden=!session.authenticated;
  if(!session.authenticated)return;
  $("teacherState").textContent="Opettaja kirjautunut";
  $("orgState").textContent=session.organization?` • Organisaatio: ${session.organization}`:" • GITHUB_ORG puuttuu";
  if(session.githubConnected){
    $("githubActions").innerHTML='<button id="disconnect" class="secondary">Katkaise GitHub-yhteys</button>';
    $("githubStatus").textContent=`GitHub yhdistetty: @${session.githubLogin}`;
    $("disconnect").onclick=async()=>{await fetch("/api/teacher/github/disconnect",{method:"POST"});refreshSession();};
  }else{
    $("githubActions").innerHTML='<a class="buttonLink" href="/auth/github/teacher">Yhdistä GitHub</a>';
    $("githubStatus").textContent="GitHub ei ole vielä yhdistetty.";
  }
  await loadData();
}

$("login").onclick=async()=>{
  $("loginStatus").textContent="Kirjaudutaan…";
  const r=await fetch("/api/teacher/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:$("password").value})});
  const d=await r.json();
  if(!r.ok){$("loginStatus").textContent=d.error||"Virhe";return;}
  $("password").value="";$("loginStatus").textContent="";refreshSession();
};
$("logout").onclick=async()=>{await fetch("/api/teacher/logout",{method:"POST"});refreshSession();};

async function loadData(){
  [groups,courses]=await Promise.all([fetch("/api/groups").then(r=>r.json()),fetch("/api/courses").then(r=>r.json())]);
  $("course").innerHTML='<option value="">Valitse kurssi</option>'+courses.courses.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
  renderAssignments();
}
function currentCourse(){return courses.courses.find(c=>c.id===$("course").value);}
function renderAssignments(){
  const c=currentCourse();
  $("assignment").innerHTML='<option value="">Valitse tehtävä</option>'+((c?.assignments||[]).map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join(""));
  const allowed=new Set(c?.groupIds||[]);
  $("group").innerHTML='<option value="">Valitse ryhmä</option>'+groups.groups.filter(g=>allowed.has(g.id)).map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join("");
}
$("course").onchange=renderAssignments;

$("preview").onclick=async()=>{
  const body={courseId:$("course").value,assignmentId:$("assignment").value,groupId:$("group").value};
  const r=await fetch("/api/distribute/preview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const d=await r.json();
  if(!r.ok){alert(d.error||"Esikatselu epäonnistui");return;}
  previewData=d;$("previewCard").hidden=false;$("resultCard").hidden=true;
  $("previewInfo").textContent=`${d.course.name} • ${d.assignment.name} • ${d.group.name} • ${d.private?"yksityiset":"julkiset"} repositoryt`;
  $("previewTable").innerHTML=`<table><thead><tr><th>Opiskelija</th><th>GitHub</th><th>Repository</th><th>Valmis</th></tr></thead><tbody>${d.rows.map(x=>`<tr><td>${esc(x.studentName)}</td><td>@${esc(x.githubUsername)}</td><td><code>${esc(x.repoUrl)}</code></td><td>${x.valid?"✅":"❌ GitHub-tunnus puuttuu"}</td></tr>`).join("")}</tbody></table>`;
};

$("distribute").onclick=async()=>{
  if(!previewData)return;
  if(!session.githubConnected){alert("Yhdistä ensin GitHub.");return;}
  if(!confirm(`Luodaanko ${previewData.rows.filter(x=>x.valid).length} opiskelijarepositorya GitHubiin?`))return;
  $("distribute").disabled=true;$("distribute").textContent="Jaetaan…";
  const r=await fetch("/api/distribute/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
    courseId:previewData.course.id,assignmentId:previewData.assignment.id,groupId:previewData.group.id
  })});
  const d=await r.json();
  $("distribute").disabled=false;$("distribute").textContent="Jaa tehtävä ryhmälle";
  if(!r.ok){alert(d.error||"Jako epäonnistui");return;}
  $("resultCard").hidden=false;
  const label=s=>s==="created"?"✅ luotu":s==="exists"?"ℹ️ oli jo olemassa":s==="created_invite_failed"?"⚠️ repo luotu, kutsu epäonnistui":s==="skipped"?"⏭️ ohitettu":"❌ epäonnistui";
  $("results").innerHTML=`<table><thead><tr><th>Opiskelija</th><th>Tila</th><th>Repository</th><th>Huomio</th></tr></thead><tbody>${d.results.map(x=>`<tr><td>${esc(x.student)}</td><td>${label(x.status)}</td><td>${x.repoUrl?`<a href="${esc(x.repoUrl)}" target="_blank">Avaa</a>`:""}</td><td>${esc(x.error||"")}</td></tr>`).join("")}</tbody></table>`;
};

refreshSession();
