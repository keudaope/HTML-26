// Haetaan demon HTML-elementit.
const run=document.getElementById("run");
const result=document.querySelector("#result");
// Näytä tulos sivulla, ei vain konsolissa.
function show(value){result.textContent=String(value);}
function log(value){result.textContent+= "\n"+value;}
run.onclick=()=>{const a=performance.now();let sum=0;for(let i=0;i<100000;i++)sum+=i;show(`${(performance.now()-a).toFixed(3)} ms, summa ${sum}`);};
document.addEventListener('visibilitychange',()=>log(document.hidden?'Piilossa':'Näkyvissä'));
