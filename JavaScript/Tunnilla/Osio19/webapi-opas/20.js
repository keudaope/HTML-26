// Haetaan demon HTML-elementit.
const panel=document.getElementById("panel");
const run=document.getElementById("run");
const share=document.getElementById("share");
const full=document.getElementById("full");
const network=document.getElementById("network");
const field=document.getElementById("field");
const result=document.querySelector("#result");
// Näytä tulos sivulla, ei vain konsolissa.
function show(value){result.textContent=String(value);}
function log(value){result.textContent+= "\n"+value;}
field.value=location.href;async function copy(){try{await navigator.clipboard.writeText(location.href);show('Kopioitu');}catch(e){field.select();show('Kopioi käsin: '+e.message);}}run.onclick=copy;share.onclick=async()=>{try{if(navigator.share)await navigator.share({url:location.href});else await copy();}catch(e){show(e.message);}};full.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await panel.requestFullscreen();}catch(e){show(e.message);}};function net(){network.textContent=navigator.onLine?'Online':'Offline';}window.addEventListener('online',net);window.addEventListener('offline',net);net();
