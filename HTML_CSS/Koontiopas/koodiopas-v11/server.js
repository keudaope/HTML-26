import express from "express";
import dotenv from "dotenv";
import session from "express-session";
import fs from "fs";
import crypto from "crypto";
dotenv.config();

const app=express(),PORT=process.env.PORT||3000;
app.use(express.json({limit:"4mb"}));
app.use(express.static("public"));
app.use(session({secret:process.env.SESSION_SECRET||"vaihda",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax",secure:false,maxAge:28800000}}));

const GROUPS="./data/groups.json",COURSES="./data/courses.json",CONFIG="./teacher-config.json";
const read=(p,f)=>{try{return JSON.parse(fs.readFileSync(p,"utf8"))}catch{return f}};
const write=(p,d)=>fs.writeFileSync(p,JSON.stringify(d,null,2),"utf8");
const auth=(req,res,next)=>req.session?.teacher?next():res.status(401).json({error:"Opettajan kirjautuminen vaaditaan."});
const slug=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");

app.post("/api/teacher/login",(req,res)=>{
  const configured=process.env.TEACHER_PASSWORD,p=String(req.body?.password||"");
  if(!configured||configured==="vaihda_tahan_vahva_salasana")return res.status(503).json({error:"Määritä TEACHER_PASSWORD .env-tiedostoon."});
  if(p!==configured)return res.status(401).json({error:"Väärä salasana."});
  req.session.teacher=true;res.json({ok:true});
});
app.post("/api/teacher/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/teacher/session",(req,res)=>res.json({authenticated:req.session?.teacher===true}));

app.get("/api/config/public",(req,res)=>res.json({teacherMessage:read(CONFIG,{}).teacherMessage||""}));
app.get("/api/config",auth,(req,res)=>res.json(read(CONFIG,{})));
app.put("/api/config",auth,(req,res)=>{write(CONFIG,req.body||{});res.json({ok:true});});

app.get("/api/groups",auth,(req,res)=>res.json(read(GROUPS,{groups:[]})));
app.put("/api/groups",auth,(req,res)=>{const groups=Array.isArray(req.body?.groups)?req.body.groups:[];write(GROUPS,{groups});res.json({ok:true,groups});});

app.get("/api/courses",auth,(req,res)=>res.json(read(COURSES,{courses:[]})));
app.put("/api/courses",auth,(req,res)=>{const courses=Array.isArray(req.body?.courses)?req.body.courses:[];write(COURSES,{courses});res.json({ok:true,courses});});

app.get("/api/courses/public",(req,res)=>{
  const groups=read(GROUPS,{groups:[]}).groups,courses=read(COURSES,{courses:[]}).courses;
  res.json({courses:courses.map(c=>({...c,groups:(c.groupIds||[]).map(id=>groups.find(g=>g.id===id)).filter(Boolean)}))});
});

app.get("/api/repo-plan",auth,(req,res)=>{
  const groups=read(GROUPS,{groups:[]}).groups,courses=read(COURSES,{courses:[]}).courses,rows=[];
  for(const c of courses)for(const a of c.assignments||[])for(const gid of c.groupIds||[]){
    const g=groups.find(x=>x.id===gid);if(!g)continue;
    for(const s of g.students||[]){
      const repoName=`${slug(a.repoPrefix||a.name)}-${slug(s.githubUsername||s.id||s.name)}`;
      const repoUrl=s.githubUsername?`https://github.com/${s.githubUsername}/${repoName}`:"";
      rows.push({course:c.name,assignment:a.name,group:g.name,student:s.name||s.id,githubUsername:s.githubUsername||"",repoUrl,templateRepoUrl:a.templateRepoUrl||""});
    }
  }
  res.json({rows});
});

app.post("/api/repo-check",auth,async(req,res)=>{
  const urls=Array.isArray(req.body?.urls)?req.body.urls.slice(0,100):[],results=[];
  for(const url of urls){
    try{
      const u=new URL(url),parts=u.pathname.split("/").filter(Boolean);
      const r=await fetch(`https://api.github.com/repos/${parts[0]}/${parts[1]}`,{headers:{"Accept":"application/vnd.github+json","User-Agent":"Koodiopas-v11"}});
      results.push({url,exists:r.ok});
    }catch{results.push({url,exists:false});}
  }
  res.json({results});
});

app.listen(PORT,()=>console.log(`Koodiopas v11: http://localhost:${PORT}`));
