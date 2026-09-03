import express from "express";
import dotenv from "dotenv";
import session from "express-session";
import fs from "fs";
import crypto from "crypto";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;
const CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";

const GROUPS = "./data/groups.json";
const COURSES = "./data/courses.json";
const DISTRIBUTIONS = "./data/distributions.json";
const SETTINGS = "./data/app-settings.json";

app.use(express.json({limit:"6mb"}));
app.use(express.static("public"));
app.use(session({
  secret: process.env.SESSION_SECRET || "vaihda-tama",
  resave:false,
  saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:"lax",secure:false,maxAge:1000*60*60*8}
}));

const read = (p,f)=>{try{return JSON.parse(fs.readFileSync(p,"utf8"))}catch{return f}};
const write = (p,d)=>fs.writeFileSync(p,JSON.stringify(d,null,2),"utf8");
const slug = s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const b64 = b=>b.toString("base64").replaceAll("+","-").replaceAll("/","_").replaceAll("=","");

function requireTeacher(req,res,next){
  if(req.session?.teacher===true) return next();
  res.status(401).json({error:"Opettajan kirjautuminen vaaditaan."});
}
function requireTeacherGithub(req,res,next){
  if(req.session?.teacher===true && req.session?.teacherGithub?.accessToken) return next();
  res.status(401).json({error:"Yhdistä ensin opettajan GitHub-tili."});
}
function settings(){
  return read(SETTINGS,{githubOrg:"",defaultRepoPrivate:true});
}
function ghHeaders(token){
  return {
    "Accept":"application/vnd.github+json",
    "Authorization":`Bearer ${token}`,
    "X-GitHub-Api-Version":"2022-11-28",
    "User-Agent":"Koodiopas-v14"
  };
}
async function ghJson(url,options={}){
  const r=await fetch(url,options);
  let data=null; try{data=await r.json()}catch{}
  if(!r.ok) throw new Error(data?.message || `GitHub API ${r.status}`);
  return data;
}
function expectedRepoName(assignment,student){
  return `${slug(assignment.repoPrefix||assignment.name)}-${slug(student.githubUsername||student.id||student.name)}`;
}
function findCourseAssignment(courseId,assignmentId){
  const courses=read(COURSES,{courses:[]}).courses||[];
  const course=courses.find(c=>c.id===courseId);
  const assignment=course?.assignments?.find(a=>a.id===assignmentId);
  return {course,assignment};
}
function findGroup(groupId){
  return (read(GROUPS,{groups:[]}).groups||[]).find(g=>g.id===groupId);
}
function parseTemplate(url){
  const u=new URL(url);
  const p=u.pathname.replace(/^\/+|\/+$/g,"").split("/");
  if(!["github.com","www.github.com"].includes(u.hostname)||p.length<2) throw new Error("Template repositoryn osoite ei kelpaa.");
  return {owner:p[0],repo:p[1].replace(/\.git$/,"")};
}

/* Teacher auth */
app.post("/api/teacher/login",(req,res)=>{
  const configured=process.env.TEACHER_PASSWORD;
  const password=String(req.body?.password||"");
  if(!configured||configured==="vaihda_tahan_vahva_salasana")
    return res.status(503).json({error:"Määritä TEACHER_PASSWORD .env-tiedostoon."});
  if(password!==configured) return res.status(401).json({error:"Väärä salasana."});
  req.session.teacher=true;
  res.json({ok:true});
});
app.post("/api/teacher/logout",(req,res)=>{
  req.session.teacher=false;
  delete req.session.teacherGithub;
  res.json({ok:true});
});
app.get("/api/teacher/session",(req,res)=>{
  const s=settings();
  res.json({
    authenticated:req.session?.teacher===true,
    githubConnected:Boolean(req.session?.teacherGithub?.accessToken),
    githubLogin:req.session?.teacherGithub?.login||"",
    githubOrg:s.githubOrg||""
  });
});

/* App settings */
app.get("/api/settings",requireTeacher,(req,res)=>res.json(settings()));
app.put("/api/settings",requireTeacher,(req,res)=>{
  const githubOrg=String(req.body?.githubOrg||"").trim().replace(/^@/,"");
  const defaultRepoPrivate=Boolean(req.body?.defaultRepoPrivate);
  const value={githubOrg,defaultRepoPrivate};
  write(SETTINGS,value);
  res.json({ok:true,settings:value});
});

/* GitHub teacher OAuth */
app.get("/auth/github/teacher",requireTeacher,(req,res)=>{
  if(!CLIENT_ID||!CLIENT_SECRET)
    return res.status(503).send("GitHub OAuth -asetukset puuttuvat .env-tiedostosta.");

  const state=b64(crypto.randomBytes(24));
  const verifier=b64(crypto.randomBytes(48));
  const challenge=b64(crypto.createHash("sha256").update(verifier).digest());

  req.session.teacherOauthState=state;
  req.session.teacherPkceVerifier=verifier;

  const params=new URLSearchParams({
    client_id:CLIENT_ID,
    redirect_uri:`${BASE_URL}/auth/github/teacher/callback`,
    scope:"repo read:org",
    state,
    code_challenge:challenge,
    code_challenge_method:"S256"
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

app.get("/auth/github/teacher/callback",async(req,res)=>{
  try{
    if(req.session?.teacher!==true) throw new Error("Opettajan sessio puuttuu.");
    const code=String(req.query.code||"");
    const state=String(req.query.state||"");
    if(!code||state!==req.session.teacherOauthState) throw new Error("OAuth-tarkistus epäonnistui.");

    const verifier=req.session.teacherPkceVerifier;
    delete req.session.teacherOauthState;
    delete req.session.teacherPkceVerifier;

    const tokenData=await ghJson("https://github.com/login/oauth/access_token",{
      method:"POST",
      headers:{"Accept":"application/json","Content-Type":"application/json"},
      body:JSON.stringify({
        client_id:CLIENT_ID,
        client_secret:CLIENT_SECRET,
        code,
        redirect_uri:`${BASE_URL}/auth/github/teacher/callback`,
        code_verifier:verifier
      })
    });

    const token=tokenData.access_token;
    if(!token) throw new Error("GitHub access token puuttuu.");

    const user=await ghJson("https://api.github.com/user",{headers:ghHeaders(token)});
    req.session.teacherGithub={login:user.login,accessToken:token};

    res.redirect("/?teacher_github=connected");
  }catch(error){
    res.redirect(`/?teacher_github=error&message=${encodeURIComponent(error.message)}`);
  }
});
app.post("/api/teacher/github/disconnect",requireTeacher,(req,res)=>{
  delete req.session.teacherGithub;
  res.json({ok:true});
});

/* Groups */
app.get("/api/groups",requireTeacher,(req,res)=>res.json(read(GROUPS,{groups:[]})));
app.put("/api/groups",requireTeacher,(req,res)=>{
  const groups=Array.isArray(req.body?.groups)?req.body.groups:[];
  write(GROUPS,{groups});
  res.json({ok:true,groups});
});

/* Courses */
app.get("/api/courses",requireTeacher,(req,res)=>res.json(read(COURSES,{courses:[]})));
app.put("/api/courses",requireTeacher,(req,res)=>{
  const courses=Array.isArray(req.body?.courses)?req.body.courses:[];
  write(COURSES,{courses});
  res.json({ok:true,courses});
});

/* Repository plan */
app.get("/api/repo-plan",requireTeacher,(req,res)=>{
  const groups=read(GROUPS,{groups:[]}).groups||[];
  const courses=read(COURSES,{courses:[]}).courses||[];
  const org=settings().githubOrg;
  const rows=[];

  for(const course of courses){
    for(const assignment of course.assignments||[]){
      for(const gid of course.groupIds||[]){
        const group=groups.find(g=>g.id===gid);
        if(!group) continue;
        for(const student of group.students||[]){
          const repoName=expectedRepoName(assignment,student);
          rows.push({
            course:course.name,
            assignment:assignment.name,
            group:group.name,
            student:student.name||student.id,
            githubUsername:student.githubUsername||"",
            repoName,
            repoUrl:org?`https://github.com/${org}/${repoName}`:""
          });
        }
      }
    }
  }
  res.json({rows});
});

/* Distribution */
app.post("/api/distribute/preview",requireTeacher,(req,res)=>{
  try{
    const {courseId,assignmentId,groupId}=req.body||{};
    const {course,assignment}=findCourseAssignment(courseId,assignmentId);
    const group=findGroup(groupId);
    const s=settings();

    if(!course||!assignment||!group)
      return res.status(404).json({error:"Kurssia, tehtävää tai ryhmää ei löytynyt."});
    if(!assignment.templateRepoUrl)
      return res.status(400).json({error:"Tehtävältä puuttuu Template repository."});
    if(!s.githubOrg)
      return res.status(400).json({error:"Aseta ensin GitHub-organisaatio kohdassa GitHub-asetukset."});

    const rows=(group.students||[]).map(student=>({
      studentId:student.id,
      studentName:student.name,
      githubUsername:student.githubUsername||"",
      repoName:expectedRepoName(assignment,student),
      repoUrl:`https://github.com/${s.githubOrg}/${expectedRepoName(assignment,student)}`,
      valid:Boolean(student.githubUsername)
    }));

    res.json({
      course:{id:course.id,name:course.name},
      assignment:{id:assignment.id,name:assignment.name,templateRepoUrl:assignment.templateRepoUrl},
      group:{id:group.id,name:group.name},
      private:assignment.privateRepo ?? s.defaultRepoPrivate,
      rows
    });
  }catch(error){
    res.status(400).json({error:error.message});
  }
});

app.post("/api/distribute/run",requireTeacherGithub,async(req,res)=>{
  try{
    const {courseId,assignmentId,groupId}=req.body||{};
    const {course,assignment}=findCourseAssignment(courseId,assignmentId);
    const group=findGroup(groupId);
    const s=settings();

    if(!course||!assignment||!group)
      return res.status(404).json({error:"Kurssia, tehtävää tai ryhmää ei löytynyt."});
    if(!assignment.templateRepoUrl)
      return res.status(400).json({error:"Template repository puuttuu."});
    if(!s.githubOrg)
      return res.status(400).json({error:"GitHub-organisaatio puuttuu."});

    const {owner:templateOwner,repo:templateRepo}=parseTemplate(assignment.templateRepoUrl);
    const token=req.session.teacherGithub.accessToken;
    const isPrivate=assignment.privateRepo ?? s.defaultRepoPrivate;

    const templateInfo=await ghJson(
      `https://api.github.com/repos/${encodeURIComponent(templateOwner)}/${encodeURIComponent(templateRepo)}`,
      {headers:ghHeaders(token)}
    );
    if(!templateInfo.is_template)
      return res.status(400).json({error:"Valittu repository ei ole merkitty GitHubissa Template repositoryksi."});

    const results=[];

    for(const student of group.students||[]){
      if(!student.githubUsername){
        results.push({student:student.name||student.id,status:"skipped",error:"GitHub-käyttäjänimi puuttuu"});
        continue;
      }

      const repoName=expectedRepoName(assignment,student);
      const repoUrl=`https://github.com/${s.githubOrg}/${repoName}`;

      try{
        const exists=await fetch(
          `https://api.github.com/repos/${encodeURIComponent(s.githubOrg)}/${encodeURIComponent(repoName)}`,
          {headers:ghHeaders(token)}
        );

        if(exists.ok){
          results.push({student:student.name||student.id,repoName,repoUrl,status:"exists"});
          continue;
        }

        await ghJson(
          `https://api.github.com/repos/${encodeURIComponent(templateOwner)}/${encodeURIComponent(templateRepo)}/generate`,
          {
            method:"POST",
            headers:{...ghHeaders(token),"Content-Type":"application/json"},
            body:JSON.stringify({
              owner:s.githubOrg,
              name:repoName,
              description:`${course.name} – ${assignment.name} – ${student.name||student.id}`,
              private:isPrivate,
              include_all_branches:false
            })
          }
        );

        const collab=await fetch(
          `https://api.github.com/repos/${encodeURIComponent(s.githubOrg)}/${encodeURIComponent(repoName)}/collaborators/${encodeURIComponent(student.githubUsername)}`,
          {
            method:"PUT",
            headers:{...ghHeaders(token),"Content-Type":"application/json"},
            body:JSON.stringify({permission:"push"})
          }
        );

        if(!collab.ok){
          let cd={};try{cd=await collab.json()}catch{}
          results.push({
            student:student.name||student.id,
            repoName,repoUrl,
            status:"created_invite_failed",
            error:cd.message||`Collaborator API ${collab.status}`
          });
        }else{
          results.push({student:student.name||student.id,repoName,repoUrl,status:"created"});
        }
      }catch(error){
        results.push({student:student.name||student.id,repoName,repoUrl,status:"failed",error:error.message});
      }
    }

    const log=read(DISTRIBUTIONS,{distributions:[]});
    log.distributions.push({
      id:crypto.randomUUID(),
      timestamp:new Date().toISOString(),
      teacherGithub:req.session.teacherGithub.login,
      organization:s.githubOrg,
      courseId,courseName:course.name,
      assignmentId,assignmentName:assignment.name,
      groupId,groupName:group.name,
      results
    });
    write(DISTRIBUTIONS,log);

    res.json({ok:true,results});
  }catch(error){
    res.status(500).json({error:error.message});
  }
});

app.listen(PORT,()=>console.log(`Koodiopas v14: ${BASE_URL}`));
