// Haetaan demon HTML-elementit.
const area=document.getElementById("area");
const result=document.querySelector("#result");
// Näytä tulos sivulla, ei vain konsolissa.
function show(value){result.textContent=String(value);}
function log(value){result.textContent+= "\n"+value;}
const cards=area.querySelectorAll('.card');if(matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window)){cards.forEach(c=>c.classList.add('visible'));}else{const o=new IntersectionObserver(es=>{for(const e of es){if(e.intersectionRatio>=.25){e.target.classList.add('visible');o.unobserve(e.target);}}},{root:area,threshold:.25});cards.forEach(c=>o.observe(c));window.addEventListener('pagehide',()=>o.disconnect());}
