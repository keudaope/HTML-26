// Haetaan demon HTML-elementit.
const run=document.getElementById("run");
const result=document.querySelector("#result");
// Näytä tulos sivulla, ei vain konsolissa.
function show(value){result.textContent=String(value);}
function log(value){result.textContent+= "\n"+value;}
function render(){show(JSON.stringify({language:navigator.language,languages:navigator.languages,onLine:navigator.onLine,clipboard:'clipboard' in navigator,share:'share' in navigator},null,2));}
run.onclick=render;window.addEventListener('online',render);window.addEventListener('offline',render);render();
