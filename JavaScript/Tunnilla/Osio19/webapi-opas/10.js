// Haetaan demon HTML-elementit.
const field=document.getElementById("field");
const run=document.getElementById("run");
const change=document.getElementById("change");
const result=document.querySelector("#result");
// Näytä tulos sivulla, ei vain konsolissa.
function show(value){result.textContent=String(value);}
function log(value){result.textContent+= "\n"+value;}
function inspect(change=false){try{const u=new URL(field.value,location.href);if(change){u.searchParams.set('q','JavaScript & CSS');u.searchParams.append('tag','web');u.searchParams.delete('page');field.value=u.href;}show(JSON.stringify({origin:u.origin,hostname:u.hostname,pathname:u.pathname,search:u.search,hash:u.hash,q:u.searchParams.get('q'),params:u.searchParams.toString()},null,2));}catch(e){show(e.message);}}
run.onclick=()=>inspect();change.onclick=()=>inspect(true);
