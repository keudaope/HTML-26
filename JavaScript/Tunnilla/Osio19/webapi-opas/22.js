// Haetaan demon HTML-elementit.
const run=document.getElementById("run");
const stop=document.getElementById("stop");
const field=document.getElementById("field");
const copy=document.getElementById("copy");
const clock=document.getElementById("clock");
const panel=document.getElementById("panel");
const measure=document.getElementById("measure");
const result=document.querySelector("#result");
// Näytä tulos sivulla, ei vain konsolissa.
function show(value){result.textContent=String(value);}
function log(value){result.textContent+= "\n"+value;}
let timer;run.onclick=()=>{clearInterval(timer);const start=performance.now();timer=setInterval(()=>clock.textContent=((performance.now()-start)/1000).toFixed(1)+' s',200);};stop.onclick=()=>clearInterval(timer);field.value=new URL(location.href).searchParams.get('q')||'';field.oninput=()=>{try{const u=new URL(location.href);u.searchParams.set('q',field.value);history.replaceState({},'',u);}catch(e){show(e.message);}};let ro;if('ResizeObserver' in window){ro=new ResizeObserver(es=>measure.textContent=Math.round(es[0].contentRect.width)+' px');ro.observe(panel);}copy.onclick=async()=>{try{if(!navigator.clipboard)throw Error('Ei tukea');await navigator.clipboard.writeText(location.href);show('Kopioitu');}catch(e){show('Kopioi osoiteriviltä: '+e.message);}};window.addEventListener('pagehide',()=>{clearInterval(timer);ro?.disconnect();});
