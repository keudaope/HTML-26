// Haetaan demon HTML-elementit.
const size=document.getElementById("size");
const panel=document.getElementById("panel");
const stop=document.getElementById("stop");
const result=document.querySelector("#result");
// Näytä tulos sivulla, ei vain konsolissa.
function show(value){result.textContent=String(value);}
function log(value){result.textContent+= "\n"+value;}
size.oninput=()=>panel.style.width=size.value+'px';
let ro;if('ResizeObserver' in window){ro=new ResizeObserver(entries=>{for(const e of entries)show(`${e.contentRect.width.toFixed(0)} × ${e.contentRect.height.toFixed(0)} px`);});ro.observe(panel);}else show('Ei tukea');
stop.onclick=()=>ro?.disconnect();
