import express from "express";
import dotenv from "dotenv";
import session from "express-session";
import fs from "fs";
import crypto from "crypto";

dotenv.config();

const app=express();
const PORT=process.env.PORT||3000;
const BASE_URL=process.env.BASE_URL||`http://127.0.0.1:${PORT}`;
const CLIENT_ID=process.env.GITHUB_CLIENT_ID||"";
const CLIENT_SECRET=process.env.GITHUB_CLIENT_SECRET||"";
const GITHUB_ORG=process.env.GITHUB_ORG||"";
const DEFAULT_PRIVATE=String(process.env.DEFAULT_REPO_PRIVATE||"true").toLowerCase()==="true";
const GROUPS="./data/groups.json", COURSES="./data/courses.json", DISTRIBUTIONS="./data/distributions.json";

app.use(express.json({limit:"4mb"}));
app.use(express.static("public"));
app.use(session({
  secret:process.env.SESSION_SECRET||"vaihda-tama",
  resave:false,
  saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:"lax",secure:false,maxAge:1000*60*60*8}
}));

const read=(p,f)=>{try{return JSON.parse(fs.readFileSync(p,"utf8"))}catch{return f}};
const write=(p,d)=>fs.writeFileSync(p,JSON.stringify(d,null,2),"utf8");
const slug=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const b64=b=>b.toString("base64").replaceAll("+","-").replaceAll("/","_").replaceAll("=","");

function requireTeacher(req,res,next){
  if(req.session?.teacher===true)return next();
  res.status(401).json({error:"Opettajan kirjautuminen vaaditaan."});
}
function requireTeacherGithub(req,res,next){
  if(req.session?.teacher===true && req.session?.teacherGithub?.accessToken)return next();
  res.status(401).json({error:"Yhdistä ensin opettajan GitHub-tili."});
}
function ghHeaders(token){
  return {
    "Accept":"application/vnd.github+json",
    "Authorization":`Bearer ${token}`,
    "X-GitHub-Api-Version":"2026-03-10",
    "User-Agent":"Koodiopas-v13"
  };
}
async function ghJson(url,options={}){
  const r=await fetch(url,options);
  let data=null; try{data=await r.json()}catch{}
  if(!r.ok)throw new Error(data?.message||`GitHub API ${r.status}`);
  return data;
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
function expectedRepoName(assignment,student){
  return `${slug(assignment.repoPrefix||assignment.name)}-${slug(student.githubUsername||student.id||student.name)}`;
}
function parseTemplate(url){
  const u=new URL(url);
  const p=u.pathname.replace(/^\/+|\/+$/g,"").split("/");
  if(!["github.com","www.github.com"].includes(u.hostname)||p.length<2)throw new Error("Template repositoryn osoite ei kelpaa.");
  return {owner:p[0],repo:p[1].replace(/\.git$/,"")};
}

app.post("/api/teacher/login",(req,res)=>{
  const configured=process.env.TEACHER_PASSWORD,password=String(req.body?.password||"");
  if(!configured||configured==="vaihda_tahan_vahva_salasana")return res.status(503).json({error:"Määritä TEACHER_PASSWORD .env-tiedostoon."});
  if(password!==configured)return res.status(401).json({error:"Väärä salasana."});
  req.session.teacher=true; res.json({ok:true});
});
app.post("/api/teacher/logout",(req,res)=>{
  req.session.teacher=false; delete req.session.teacherGithub; res.json({ok:true});
});
app.get("/api/teacher/session",(req,res)=>res.json({
  authenticated:req.session?.teacher===true,
  githubConnected:Boolean(req.session?.teacherGithub?.accessToken),
  githubLogin:req.session?.teacherGithub?.login||"",
  organization:GITHUB_ORG
}));

app.get("/auth/github/teacher",requireTeacher,(req,res)=>{
  if(!CLIENT_ID||!CLIENT_SECRET)return res.status(503).send("GitHub OAuth -asetukset puuttuvat.");
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
    if(req.session?.teacher!==true)throw new Error("Opettajan sessio puuttuu.");
    const code=String(req.query.code||""),state=String(req.query.state||"");
    if(!code||state!==req.session.teacherOauthState)throw new Error("OAuth-tarkistus epäonnistui.");
    const verifier=req.session.teacherPkceVerifier;
    delete req.session.teacherOauthState; delete req.session.teacherPkceVerifier;

    const tokenData=await ghJson("https://github.com/login/oauth/access_token",{
      method:"POST",
      headers:{"Accept":"application/json","Content-Type":"application/json"},
      body:JSON.stringify({
        client_id:CLIENT_ID,client_secret:CLIENT_SECRET,code,
        redirect_uri:`${BASE_URL}/auth/github/teacher/callback`,
        code_verifier:verifier
      })
    });
    const token=tokenData.access_token;
    const user=await ghJson("https://api.github.com/user",{headers:ghHeaders(token)});
    req.session.teacherGithub={login:user.login,accessToken:token};
    res.redirect("/?teacher_github=connected");
  }catch(error){
    res.redirect(`/?teacher_github=error&message=${encodeURIComponent(error.message)}`);
  }
});

app.post("/api/teacher/github/disconnect",requireTeacher,(req,res)=>{
  delete req.session.teacherGithub; res.json({ok:true});
});

app.get("/api/groups",requireTeacher,(req,res)=>res.json(read(GROUPS,{groups:[]})));
app.put("/api/groups",requireTeacher,(req,res)=>{
  const groups=Array.isArray(req.body?.groups)?req.body.groups:[];
  write(GROUPS,{groups});res.json({ok:true,groups});
});
app.get("/api/courses",requireTeacher,(req,res)=>res.json(read(COURSES,{courses:[]})));
app.put("/api/courses",requireTeacher,(req,res)=>{
  const courses=Array.isArray(req.body?.courses)?req.body.courses:[];
  write(COURSES,{courses});res.json({ok:true,courses});
});

app.post("/api/distribute/preview",requireTeacher,(req,res)=>{
  try{
    const {courseId,assignmentId,groupId}=req.body||{};
    const {course,assignment}=findCourseAssignment(courseId,assignmentId);
    const group=findGroup(groupId);
    if(!course||!assignment||!group)return res.status(404).json({error:"Kurssia, tehtävää tai ryhmää ei löytynyt."});
    if(!assignment.templateRepoUrl)return res.status(400).json({error:"Tehtävältä puuttuu template repository."});
    if(!GITHUB_ORG)return res.status(400).json({error:"GITHUB_ORG puuttuu .env-tiedostosta."});
    const rows=(group.students||[]).map(student=>({
      studentId:student.id,studentName:student.name,githubUsername:student.githubUsername||"",
      repoName:expectedRepoName(assignment,student),
      repoUrl:`https://github.com/${GITHUB_ORG}/${expectedRepoName(assignment,student)}`,
      valid:Boolean(student.githubUsername)
    }));
    res.json({
      course:{id:course.id,name:course.name},
      assignment:{id:assignment.id,name:assignment.name,templateRepoUrl:assignment.templateRepoUrl},
      group:{id:group.id,name:group.name},
      private:assignment.privateRepo??DEFAULT_PRIVATE,
      rows
    });
  }catch(error){res.status(400).json({error:error.message});}
});

app.post("/api/distribute/run",requireTeacherGithub,async(req,res)=>{
  try{
    const {courseId,assignmentId,groupId}=req.body||{};
    const {course,assignment}=findCourseAssignment(courseId,assignmentId);
    const group=findGroup(groupId);
    if(!course||!assignment||!group)return res.status(404).json({error:"Kurssia, tehtävää tai ryhmää ei löytynyt."});
    if(!assignment.templateRepoUrl)return res.status(400).json({error:"Template repository puuttuu."});
    if(!GITHUB_ORG)return res.status(400).json({error:"GITHUB_ORG puuttuu .env-tiedostosta."});

    const {owner:templateOwner,repo:templateRepo}=parseTemplate(assignment.templateRepoUrl);
    const token=req.session.teacherGithub.accessToken;
    const isPrivate=assignment.privateRepo??DEFAULT_PRIVATE;
    const templateInfo=await ghJson(`https://api.github.com/repos/${encodeURIComponent(templateOwner)}/${encodeURIComponent(templateRepo)}`,{headers:ghHeaders(token)});
    if(!templateInfo.is_template)return res.status(400).json({error:"Valittu repository ei ole GitHubissa Template repository."});

    const results=[];
    for(const student of group.students||[]){
      if(!student.githubUsername){
        results.push({student:student.name||student.id,status:"skipped",error:"GitHub-käyttäjänimi puuttuu"});
        continue;
      }

      const repoName=expectedRepoName(assignment,student);
      const repoUrl=`https://github.com/${GITHUB_ORG}/${repoName}`;
      try{
        const exists=await fetch(`https://api.github.com/repos/${encodeURIComponent(GITHUB_ORG)}/${encodeURIComponent(repoName)}`,{headers:ghHeaders(token)});
        if(exists.ok){
          results.push({student:student.name||student.id,repoName,repoUrl,status:"exists"});
          continue;
        }

        await ghJson(`https://api.github.com/repos/${encodeURIComponent(templateOwner)}/${encodeURIComponent(templateRepo)}/generate`,{
          method:"POST",
          headers:{...ghHeaders(token),"Content-Type":"application/json"},
          body:JSON.stringify({
            owner:GITHUB_ORG,
            name:repoName,
            description:`${course.name} – ${assignment.name} – ${student.name||student.id}`,
            private:isPrivate,
            include_all_branches:false
          })
        });

        const collab=await fetch(`https://api.github.com/repos/${encodeURIComponent(GITHUB_ORG)}/${encodeURIComponent(repoName)}/collaborators/${encodeURIComponent(student.githubUsername)}`,{
          method:"PUT",
          headers:{...ghHeaders(token),"Content-Type":"application/json"},
          body:JSON.stringify({permission:"push"})
        });
        if(!collab.ok){
          let cd={};try{cd=await collab.json()}catch{}
          results.push({student:student.name||student.id,repoName,repoUrl,status:"created_invite_failed",error:cd.message||`Collaborator API ${collab.status}`});
        }else{
          results.push({student:student.name||student.id,repoName,repoUrl,status:"created"});
        }
      }catch(error){
        results.push({student:student.name||student.id,repoName,repoUrl,status:"failed",error:error.message});
      }
    }

    const log=read(DISTRIBUTIONS,{distributions:[]});
    log.distributions.push({
      id:crypto.randomUUID(),timestamp:new Date().toISOString(),
      teacherGithub:req.session.teacherGithub.login,
      courseId,courseName:course.name,assignmentId,assignmentName:assignment.name,
      groupId,groupName:group.name,organization:GITHUB_ORG,results
    });
    write(DISTRIBUTIONS,log);
    res.json({ok:true,results});
  }catch(error){res.status(500).json({error:error.message});}
});

app.listen(PORT,()=>console.log(`Koodiopas v13: ${BASE_URL}`));
