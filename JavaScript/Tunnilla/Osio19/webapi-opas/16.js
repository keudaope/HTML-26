// Haetaan demon HTML-elementit.
const run=document.getElementById("run");
const result=document.querySelector("#result");
// Näytä tulos sivulla, ei vain konsolissa.
function show(value){result.textContent=String(value);}
function log(value){result.textContent+= "\n"+value;}
run.onclick=()=>show(JSON.stringify({secureContext:isSecureContext,clipboard:!!navigator.clipboard,share:!!navigator.share,geolocation:!!navigator.geolocation,observer:'IntersectionObserver' in window,fullscreen:!!document.documentElement.requestFullscreen},null,2));
