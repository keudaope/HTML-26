// Haetaan demon HTML-elementit.
const run=document.getElementById("run");
const stop=document.getElementById("stop");
const bar=document.getElementById("bar");
const result=document.querySelector("#result");
// Näytä tulos sivulla, ei vain konsolissa.
function show(value){result.textContent=String(value);}
function log(value){result.textContent+= "\n"+value;}
let timer,frame;function close(){clearTimeout(timer);cancelAnimationFrame(frame);bar.value=0;show('Suljettu');}run.onclick=()=>{close();show('Ilmoitus');const start=performance.now();function tick(t){bar.value=Math.max(0,3000-(t-start));if(bar.value>0)frame=requestAnimationFrame(tick);}frame=requestAnimationFrame(tick);timer=setTimeout(close,3000);};stop.onclick=close;
