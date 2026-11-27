// Haetaan demon HTML-elementit.
const run=document.getElementById("run");
const stop=document.getElementById("stop");
const area=document.getElementById("area");
const result=document.querySelector("#result");
// Näytä tulos sivulla, ei vain konsolissa.
function show(value){result.textContent=String(value);}
function log(value){result.textContent+= "\n"+value;}
let observer;
run.onclick=()=>{observer?.disconnect();if(!('IntersectionObserver' in window)){show('Ei tukea');return;}observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting&&entry.intersectionRatio>=0.25){entry.target.classList.add('visible');log(entry.target.textContent+' näkyy');observer.unobserve(entry.target);}}},{root:area,threshold:0.25});area.querySelectorAll('.card').forEach(c=>{c.classList.remove('visible');observer.observe(c);});};
stop.onclick=()=>observer?.disconnect();
