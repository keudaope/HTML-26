// Haetaan demon HTML-elementit.
const panel=document.getElementById("panel");
const run=document.getElementById("run");
const stop=document.getElementById("stop");
const down=document.getElementById("down");
const up=document.getElementById("up");
const target=document.getElementById("target");
const result=document.querySelector("#result");
// Näytä tulos sivulla, ei vain konsolissa.
function show(value){result.textContent=String(value);}
function log(value){result.textContent+= "\n"+value;}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');function behavior(){return reduced.matches?'instant':'smooth';}
run.onclick=async()=>{try{await panel.requestFullscreen();}catch(e){show(e.message);}};stop.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();}catch(e){show(e.message);}};
document.addEventListener('fullscreenchange',()=>show(document.fullscreenElement?'Koko näyttö':'Normaalitila'));
down.onclick=()=>target.scrollIntoView({behavior:behavior()});up.onclick=()=>window.scrollTo({top:0,behavior:behavior()});function update(){show('Vähennetty liike: '+reduced.matches);}reduced.addEventListener('change',update);update();
