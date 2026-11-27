// Haetaan demon HTML-elementit.
const run=document.getElementById("run");
const stop=document.getElementById("stop");
const result=document.querySelector("#result");
// Näytä tulos sivulla, ei vain konsolissa.
function show(value){result.textContent=String(value);}
function log(value){result.textContent+= "\n"+value;}
let timer, n=0;
run.onclick=()=>{clearInterval(timer);n=0;show(n);timer=setInterval(()=>{show(++n);if(n===5)clearInterval(timer);},1000);};
stop.onclick=()=>clearInterval(timer);
