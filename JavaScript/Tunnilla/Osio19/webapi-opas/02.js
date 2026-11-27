// Haetaan demon HTML-elementit.
const run=document.getElementById("run");
const stop=document.getElementById("stop");
const result=document.querySelector("#result");
// Näytä tulos sivulla, ei vain konsolissa.
function show(value){result.textContent=String(value);}
function log(value){result.textContent+= "\n"+value;}
let timer;
run.onclick=()=>{clearTimeout(timer);show('Ilmoitus näkyy');timer=setTimeout(()=>show('Ilmoitus poistui'),3000);};
stop.onclick=()=>{clearTimeout(timer);show('Suljettu');};
