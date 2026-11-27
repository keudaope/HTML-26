// Haetaan demon HTML-elementit.
const run=document.getElementById("run");
const next=document.getElementById("next");
const replace=document.getElementById("replace");
const reload=document.getElementById("reload");
const result=document.querySelector("#result");
// Näytä tulos sivulla, ei vain konsolissa.
function show(value){result.textContent=String(value);}
function log(value){result.textContent+= "\n"+value;}
function render(){show('Näkymä: '+(new URL(location.href).searchParams.get('view')||'alku')+'\n'+location.href);}
function navigate(view,replace=false){try{const u=new URL(location.href);u.searchParams.set('view',view);history[replace?'replaceState':'pushState']({view},'',u);render();}catch(e){show('Käytä localhostia: '+e.message);}}
run.onclick=()=>navigate('A');next.onclick=()=>navigate('B');replace.onclick=()=>navigate('C',true);reload.onclick=()=>location.reload();window.addEventListener('popstate',render);render();
