
import express from "express";
import dotenv from "dotenv";
import session from "express-session";
import fs from "fs";
import crypto from "crypto";
import OpenAI from "openai";

dotenv.config();

const app=express();
const PORT=process.env.PORT||3000;
const BASE_URL=process.env.BASE_URL||`http://127.0.0.1:${PORT}`;
const CLIENT_ID=process.env.GITHUB_CLIENT_ID||"";
const CLIENT_SECRET=process.env.GITHUB_CLIENT_SECRET||"";
const OPENAI_MODEL=process.env.OPENAI_MODEL||"gpt-5.6";

const F={
  groups:"./data/groups.json",
  courses:"./data/courses.json",
  distributions:"./data/distributions.json",
  analytics:"./data/analytics.json",
  settings:"./data/app-settings.json"
};

app.use(express.json({limit:"8mb"}));
app.use(express.static("public"));
app.use(session({
  secret:process.env.SESSION_SECRET||"vaihda-tama",
  resave:false,saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:"lax",secure:false,maxAge:1000*60*60*8}
}));

const read=(p,f)=>{try{return JSON.parse(fs.readFileSync(p,"utf8"))}catch{return f}};
const write=(p,d)=>fs.writeFileSync(p,JSON.stringify(d,null,2),"utf8");
const slug=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const b64=b=>b.toString("base64").replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
const settings=()=>read(F.settings,{githubOrg:"",defaultRepoPrivate:true});

function teacher(req,res,next){if(req.session?.teacher)return next();res.status(401).json({error:"Opettajan kirjautuminen vaaditaan."});}
function student(req,res,next){if(req.session?.studentGithub?.login)return next();res.status(401).json({error:"GitHub-kirjautuminen vaaditaan."});}
function ghHeaders(token){return {"Accept":"application/vnd.github+json","Authorization":`Bearer ${token}`,"X-GitHub-Api-Version":"2022-11-28","User-Agent":"Koodiopas-v15"};}
async function ghJson(url,options={}){const r=await fetch(url,options);let d=null;try{d=await r.json()}catch{}if(!r.ok)throw new Error(d?.message||`GitHub API ${r.status}`);return d;}

function expectedRepoName(a,s){return `${slug(a.repoPrefix||a.name)}-${slug(s.githubUsername||s.id||s.name)}`;}
function repoUrl(a,s){const org=settings().githubOrg;return org?`https://github.com/${org}/${expectedRepoName(a,s)}`:"";}
function findStudent(login){
  const groups=read(F.groups,{groups:[]}).groups||[];
  for(const g of groups)for(const s of g.students||[])
    if(String(s.githubUsername||"").toLowerCase()===String(login||"").toLowerCase())return {group:g,student:s};
  return null;
}
function workspace(login){
  const m=findStudent(login); if(!m)return {matched:false,courses:[]};
  const courses=(read(F.courses,{courses:[]}).courses||[]).filter(c=>(c.groupIds||[]).includes(m.group.id)).map(c=>({
    id:c.id,name:c.name,
    assignments:(c.assignments||[]).map(a=>({...a,repoUrl:repoUrl(a,m.student)}))
  }));
  return {matched:true,student:m.student,group:m.group,courses};
}
function appendAnalytics(e){
  const d=read(F.analytics,{events:[]});
  d.events.push({id:crypto.randomUUID(),timestamp:new Date().toISOString(),...e});
  if(d.events.length>15000)d.events=d.events.slice(-15000);
  write(F.analytics,d);
}
function parseRepo(url){
  const u=new URL(url),p=u.pathname.replace(/^\/+|\/+$/g,"").split("/");
  if(!["github.com","www.github.com"].includes(u.hostname)||p.length<2)throw new Error("Repository-osoite ei kelpaa.");
  return {owner:p[0],repo:p[1]};
}
const exts=new Set([".html",".htm",".css",".js",".jsx",".ts",".tsx",".cs",".csproj",".json",".md",".txt"]);
const ext=p=>p.includes(".")?p.slice(p.lastIndexOf(".")).toLowerCase():"";
async function repoFiles(url,token){
  const {owner,repo}=parseRepo(url);
  const info=await ghJson(`https://api.github.com/repos/${owner}/${repo}`,{headers:ghHeaders(token)});
  const tree=await ghJson(`https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(info.default_branch)}?recursive=1`,{headers:ghHeaders(token)});
  const paths=(tree.tree||[]).filter(x=>x.type==="blob"&&exts.has(ext(x.path))&&!/(^|\/)(node_modules|bin|obj|dist|build)(\/|$)/i.test(x.path)).slice(0,30).map(x=>x.path);
  const files=[];
  for(const p of paths){
    const r=await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${p.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(info.default_branch)}`,{headers:ghHeaders(token)});
    if(!r.ok)continue;
    const d=await r.json();
    if(d.encoding==="base64"&&d.content){
      let text=Buffer.from(d.content.replace(/\n/g,""),"base64").toString("utf8");
      if(text.length>22000)text=text.slice(0,22000)+"\n[Tiedosto katkaistu analyysia varten]";
      files.push({path:p,content:text});
    }
  }
  return files;
}
function levelRule(level,a,attempts){
  if(level===1)return "Anna vain pieni vihje. Älä kirjoita korjattua koodia.";
  if(level===2)return "Anna tarkempi vihje ja nimeä relevantti käsite, mutta älä anna valmista ratkaisua.";
  if(level===3)return "Anna rinnakkainen esimerkki eri nimillä tai arvoilla, jotta opiskelija voi soveltaa sitä.";
  return a.allowFullSolution&&attempts>=Number(a.minAttemptsBeforeFullSolution||4)
    ?"Malliratkaisu on sallittu vain ongelman olennaiselta osalta. Selitä muutos."
    :"Malliratkaisu ei ole sallittu. Anna erittäin tarkka vihje ja rinnakkainen esimerkki.";
}
function prompt({course,a,s,files,message,history,level}){
  return `Olet Koodiopas, pedagoginen ohjelmoinnin apuagentti.
Kurssi: ${course.name}
Tehtävä: ${a.name}
Tehtävänanto: ${a.instructions||"Ei erillistä tehtävänantoa."}
Opiskelija: ${s.name||s.githubUsername}

Vihjetaso ${level}: ${levelRule(level,a,history.length+1)}

Säännöt:
- auta opiskelijaa ratkaisemaan itse
- käsittele ensin tärkeintä etenemistä estävää ongelmaa
- kerro tiedosto ja ongelmakohta mahdollisimman täsmällisesti
- selitä mikä on väärin, miksi ja mitä kannattaa kokeilla seuraavaksi
- älä väitä suorittaneesi koodia
- älä anna valmista ratkaisua, ellei taso 4 sitä salli
- vastaa selkeällä suomella

Opiskelijan viesti:
${message||"Tarvitsen apua."}

Aiemmat yritykset:
${history.length?history.slice(-8).map((h,i)=>`${i+1}. Opiskelija: ${h.student}\nKoodiopas: ${h.assistant}`).join("\n\n"):"Ei aiempia yrityksiä."}

Repository:
${files.map(f=>`\n===== ${f.path} =====\n${f.content}`).join("\n")}`;
}

/* teacher auth */
app.post("/api/teacher/login",(req,res)=>{
  const p=String(req.body?.password||""),configured=process.env.TEACHER_PASSWORD;
  if(!configured||configured==="vaihda_tahan_vahva_salasana")return res.status(503).json({error:"Määritä TEACHER_PASSWORD .env-tiedostoon."});
  if(p!==configured)return res.status(401).json({error:"Väärä salasana."});
  req.session.teacher=true;res.json({ok:true});
});
app.post("/api/teacher/logout",(req,res)=>{req.session.teacher=false;res.json({ok:true});});
app.get("/api/teacher/session",(req,res)=>res.json({authenticated:Boolean(req.session?.teacher)}));

/* student GitHub OAuth */
app.get("/auth/github/student",(req,res)=>{
  if(!CLIENT_ID||!CLIENT_SECRET)return res.status(503).send("GitHub OAuth -asetukset puuttuvat.");
  const state=b64(crypto.randomBytes(24)),verifier=b64(crypto.randomBytes(48)),challenge=b64(crypto.createHash("sha256").update(verifier).digest());
  req.session.studentOauthState=state;req.session.studentPkceVerifier=verifier;
  const q=new URLSearchParams({
    client_id:CLIENT_ID,redirect_uri:`${BASE_URL}/auth/github/student/callback`,
    scope:"repo read:org",state,code_challenge:challenge,code_challenge_method:"S256"
  });
  res.redirect(`https://github.com/login/oauth/authorize?${q}`);
});
app.get("/auth/github/student/callback",async(req,res)=>{
  try{
    const code=String(req.query.code||""),state=String(req.query.state||"");
    if(!code||state!==req.session.studentOauthState)throw new Error("OAuth-tarkistus epäonnistui.");
    const verifier=req.session.studentPkceVerifier;
    delete req.session.studentOauthState;delete req.session.studentPkceVerifier;
    const td=await ghJson("https://github.com/login/oauth/access_token",{
      method:"POST",headers:{"Accept":"application/json","Content-Type":"application/json"},
      body:JSON.stringify({client_id:CLIENT_ID,client_secret:CLIENT_SECRET,code,redirect_uri:`${BASE_URL}/auth/github/student/callback`,code_verifier:verifier})
    });
    const user=await ghJson("https://api.github.com/user",{headers:ghHeaders(td.access_token)});
    req.session.studentGithub={login:user.login,name:user.name||"",avatarUrl:user.avatar_url||"",accessToken:td.access_token};
    res.redirect("/?student=ok");
  }catch(e){res.redirect(`/?student=error&message=${encodeURIComponent(e.message)}`);}
});
app.post("/api/student/logout",(req,res)=>{delete req.session.studentGithub;res.json({ok:true});});
app.get("/api/student/session",(req,res)=>{
  const u=req.session?.studentGithub;if(!u)return res.json({authenticated:false});
  const w=workspace(u.login);
  res.json({authenticated:true,githubUser:{login:u.login,name:u.name,avatarUrl:u.avatarUrl},matched:w.matched,student:w.student||null,group:w.group||null});
});
app.get("/api/student/workspace",student,(req,res)=>res.json(workspace(req.session.studentGithub.login)));

app.post("/api/student/analyze",student,async(req,res)=>{
  try{
    const {courseId,assignmentId,message="",requestedLevel=1,history=[]}=req.body||{};
    const w=workspace(req.session.studentGithub.login);
    if(!w.matched)return res.status(403).json({error:"GitHub-tunnustasi ei ole liitetty opiskelijaan."});
    const course=w.courses.find(c=>c.id===courseId),a=course?.assignments.find(x=>x.id===assignmentId);
    if(!course||!a)return res.status(404).json({error:"Kurssia tai tehtävää ei löytynyt."});
    const level=Math.max(1,Math.min(Number(a.maxHintLevel||3),Number(requestedLevel)||1));

    appendAnalytics({
      githubUsername:w.student.githubUsername,studentId:w.student.id,studentName:w.student.name,
      groupId:w.group.id,groupName:w.group.name,courseId:course.id,courseName:course.name,
      assignmentId:a.id,assignmentName:a.name,repoUrl:a.repoUrl,level,message:String(message).slice(0,500)
    });

    if(!process.env.OPENAI_API_KEY)return res.status(503).json({demo:true,error:"Työtila ja analytiikka toimivat. Lisää OPENAI_API_KEY .env-tiedostoon tekoälyvihjeitä varten.",level});

    const files=await repoFiles(a.repoUrl,req.session.studentGithub.accessToken);
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const response=await client.responses.create({model:OPENAI_MODEL,input:prompt({course,a,s:w.student,files,message,history,level}),store:false});
    res.json({answer:response.output_text||"",level,maxHintLevel:Number(a.maxHintLevel||3),files:files.map(f=>f.path)});
  }catch(e){res.status(500).json({error:e.message||"Analyysi epäonnistui."});}
});

/* teacher history + analytics */
app.get("/api/teacher/distributions",teacher,(req,res)=>res.json(read(F.distributions,{distributions:[]})));
app.get("/api/teacher/analytics",teacher,(req,res)=>{
  const events=read(F.analytics,{events:[]}).events||[];
  const map=new Map();
  for(const e of events){
    const k=e.studentId||e.githubUsername;
    if(!map.has(k))map.set(k,{studentId:e.studentId,studentName:e.studentName,githubUsername:e.githubUsername,groupName:e.groupName,attempts:0,maxLevel:0,assignments:new Set(),lastAt:null});
    const s=map.get(k);s.attempts++;s.maxLevel=Math.max(s.maxLevel,Number(e.level)||1);s.assignments.add(e.assignmentName);
    if(!s.lastAt||new Date(e.timestamp)>new Date(s.lastAt))s.lastAt=e.timestamp;
  }
  res.json({
    totalAttempts:events.length,
    highLevelAttempts:events.filter(e=>Number(e.level)>=3).length,
    students:[...map.values()].map(s=>({...s,assignments:[...s.assignments]})).sort((a,b)=>b.attempts-a.attempts),
    recent:events.slice(-30).reverse()
  });
});


/* v14 hallinta säilytetty v15:ssa */
app.get("/api/groups",teacher,(req,res)=>res.json(read(F.groups,{groups:[]})));
app.put("/api/groups",teacher,(req,res)=>{
  const groups=Array.isArray(req.body?.groups)?req.body.groups:[];
  write(F.groups,{groups});res.json({ok:true,groups});
});
app.get("/api/courses",teacher,(req,res)=>res.json(read(F.courses,{courses:[]})));
app.put("/api/courses",teacher,(req,res)=>{
  const courses=Array.isArray(req.body?.courses)?req.body.courses:[];
  write(F.courses,{courses});res.json({ok:true,courses});
});
app.get("/api/settings",teacher,(req,res)=>res.json(settings()));
app.put("/api/settings",teacher,(req,res)=>{
  const value={githubOrg:String(req.body?.githubOrg||"").trim().replace(/^@/,""),defaultRepoPrivate:Boolean(req.body?.defaultRepoPrivate)};
  write(F.settings,value);res.json({ok:true,settings:value});
});

app.get("/api/teacher/github/session",teacher,(req,res)=>res.json({
  connected:Boolean(req.session?.teacherGithub?.accessToken),
  login:req.session?.teacherGithub?.login||"",
  githubOrg:settings().githubOrg||""
}));
app.get("/auth/github/teacher",teacher,(req,res)=>{
  if(!CLIENT_ID||!CLIENT_SECRET)return res.status(503).send("GitHub OAuth -asetukset puuttuvat.");
  const state=b64(crypto.randomBytes(24)),verifier=b64(crypto.randomBytes(48)),challenge=b64(crypto.createHash("sha256").update(verifier).digest());
  req.session.teacherOauthState=state;req.session.teacherPkceVerifier=verifier;
  const q=new URLSearchParams({
    client_id:CLIENT_ID,redirect_uri:`${BASE_URL}/auth/github/teacher/callback`,
    scope:"repo read:org",state,code_challenge:challenge,code_challenge_method:"S256"
  });
  res.redirect(`https://github.com/login/oauth/authorize?${q}`);
});
app.get("/auth/github/teacher/callback",async(req,res)=>{
  try{
    if(!req.session?.teacher)throw new Error("Opettajan sessio puuttuu.");
    const code=String(req.query.code||""),state=String(req.query.state||"");
    if(!code||state!==req.session.teacherOauthState)throw new Error("OAuth-tarkistus epäonnistui.");
    const verifier=req.session.teacherPkceVerifier;delete req.session.teacherOauthState;delete req.session.teacherPkceVerifier;
    const td=await ghJson("https://github.com/login/oauth/access_token",{
      method:"POST",headers:{"Accept":"application/json","Content-Type":"application/json"},
      body:JSON.stringify({client_id:CLIENT_ID,client_secret:CLIENT_SECRET,code,redirect_uri:`${BASE_URL}/auth/github/teacher/callback`,code_verifier:verifier})
    });
    const user=await ghJson("https://api.github.com/user",{headers:ghHeaders(td.access_token)});
    req.session.teacherGithub={login:user.login,accessToken:td.access_token};
    res.redirect("/?teacher_github=ok");
  }catch(e){res.redirect(`/?teacher_github=error&message=${encodeURIComponent(e.message)}`);}
});
app.post("/api/teacher/github/disconnect",teacher,(req,res)=>{delete req.session.teacherGithub;res.json({ok:true});});

function parseTemplate(url){
  const u=new URL(url),p=u.pathname.replace(/^\/+|\/+$/g,"").split("/");
  if(!["github.com","www.github.com"].includes(u.hostname)||p.length<2)throw new Error("Template repositoryn osoite ei kelpaa.");
  return {owner:p[0],repo:p[1].replace(/\.git$/,"")};
}
function findCourseAssignment(courseId,assignmentId){
  const courses=read(F.courses,{courses:[]}).courses||[];
  const course=courses.find(c=>c.id===courseId),assignment=course?.assignments?.find(a=>a.id===assignmentId);
  return {course,assignment};
}
function findGroup(groupId){return (read(F.groups,{groups:[]}).groups||[]).find(g=>g.id===groupId);}

app.post("/api/distribute/preview",teacher,(req,res)=>{
  try{
    const {courseId,assignmentId,groupId}=req.body||{}, {course,assignment}=findCourseAssignment(courseId,assignmentId),group=findGroup(groupId),st=settings();
    if(!course||!assignment||!group)return res.status(404).json({error:"Kurssia, tehtävää tai ryhmää ei löytynyt."});
    if(!assignment.templateRepoUrl)return res.status(400).json({error:"Tehtävältä puuttuu Template repository."});
    if(!st.githubOrg)return res.status(400).json({error:"Aseta ensin GitHub-organisaatio."});
    const rows=(group.students||[]).map(s=>({studentId:s.id,studentName:s.name,githubUsername:s.githubUsername||"",repoName:expectedRepoName(assignment,s),repoUrl:repoUrl(assignment,s),valid:Boolean(s.githubUsername)}));
    res.json({course:{id:course.id,name:course.name},assignment:{id:assignment.id,name:assignment.name,templateRepoUrl:assignment.templateRepoUrl},group:{id:group.id,name:group.name},private:assignment.privateRepo??st.defaultRepoPrivate,rows});
  }catch(e){res.status(400).json({error:e.message});}
});
app.post("/api/distribute/run",teacher,async(req,res)=>{
  try{
    if(!req.session?.teacherGithub?.accessToken)return res.status(401).json({error:"Yhdistä ensin opettajan GitHub-tili."});
    const {courseId,assignmentId,groupId}=req.body||{}, {course,assignment}=findCourseAssignment(courseId,assignmentId),group=findGroup(groupId),st=settings();
    if(!course||!assignment||!group)return res.status(404).json({error:"Kurssia, tehtävää tai ryhmää ei löytynyt."});
    const {owner:to,repo:tr}=parseTemplate(assignment.templateRepoUrl),token=req.session.teacherGithub.accessToken,isPrivate=assignment.privateRepo??st.defaultRepoPrivate;
    const ti=await ghJson(`https://api.github.com/repos/${encodeURIComponent(to)}/${encodeURIComponent(tr)}`,{headers:ghHeaders(token)});
    if(!ti.is_template)return res.status(400).json({error:"Valittu repository ei ole merkitty GitHubissa Template repositoryksi."});
    const results=[];
    for(const stu of group.students||[]){
      if(!stu.githubUsername){results.push({student:stu.name||stu.id,status:"skipped",error:"GitHub-käyttäjänimi puuttuu"});continue;}
      const name=expectedRepoName(assignment,stu),url=`https://github.com/${st.githubOrg}/${name}`;
      try{
        const ex=await fetch(`https://api.github.com/repos/${encodeURIComponent(st.githubOrg)}/${encodeURIComponent(name)}`,{headers:ghHeaders(token)});
        if(ex.ok){results.push({student:stu.name||stu.id,repoName:name,repoUrl:url,status:"exists"});continue;}
        await ghJson(`https://api.github.com/repos/${encodeURIComponent(to)}/${encodeURIComponent(tr)}/generate`,{
          method:"POST",headers:{...ghHeaders(token),"Content-Type":"application/json"},
          body:JSON.stringify({owner:st.githubOrg,name,description:`${course.name} – ${assignment.name} – ${stu.name||stu.id}`,private:isPrivate,include_all_branches:false})
        });
        const cr=await fetch(`https://api.github.com/repos/${encodeURIComponent(st.githubOrg)}/${encodeURIComponent(name)}/collaborators/${encodeURIComponent(stu.githubUsername)}`,{
          method:"PUT",headers:{...ghHeaders(token),"Content-Type":"application/json"},body:JSON.stringify({permission:"push"})
        });
        if(!cr.ok){let cd={};try{cd=await cr.json()}catch{};results.push({student:stu.name||stu.id,repoName:name,repoUrl:url,status:"created_invite_failed",error:cd.message||`Collaborator API ${cr.status}`});}
        else results.push({student:stu.name||stu.id,repoName:name,repoUrl:url,status:"created"});
      }catch(e){results.push({student:stu.name||stu.id,repoName:name,repoUrl:url,status:"failed",error:e.message});}
    }
    const log=read(F.distributions,{distributions:[]});log.distributions.push({id:crypto.randomUUID(),timestamp:new Date().toISOString(),teacherGithub:req.session.teacherGithub.login,organization:st.githubOrg,courseId,courseName:course.name,assignmentId,assignmentName:assignment.name,groupId,groupName:group.name,results});write(F.distributions,log);
    res.json({ok:true,results});
  }catch(e){res.status(500).json({error:e.message});}
});

app.listen(PORT,()=>console.log(`Koodiopas v15: ${BASE_URL}`));
