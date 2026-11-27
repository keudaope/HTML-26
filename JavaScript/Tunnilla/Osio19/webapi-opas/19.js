// Haetaan demon HTML-elementit.
const field=document.getElementById("field");
const page=document.getElementById("page");
const run=document.getElementById("run");
const result=document.querySelector("#result");
// Näytä tulos sivulla, ei vain konsolissa.
function show(value){result.textContent=String(value);}
function log(value){result.textContent+= "\n"+value;}
function render(){const p=new URL(location.href).searchParams;field.value=p.get('q')||'';page.value=p.get('page')||1;show(location.href);}function save(push=false){try{const u=new URL(location.href);u.searchParams.set('q',field.value);u.searchParams.set('page',page.value);history[push?'pushState':'replaceState']({},'',u);show(u.href);}catch(e){show(e.message);}}field.oninput=page.oninput=()=>save();run.onclick=()=>save(true);window.addEventListener('popstate',render);render();
