// Haetaan demon HTML-elementit.
const ball=document.getElementById("ball");
const run=document.getElementById("run");
const stop=document.getElementById("stop");
const result=document.querySelector("#result");
// Näytä tulos sivulla, ei vain konsolissa.
function show(value){result.textContent=String(value);}
function log(value){result.textContent+= "\n"+value;}
let frame,start;
function animate(t){start??=t;const x=(t-start)/10;ball.style.transform=`translateX(${Math.min(x,ball.parentElement.clientWidth-40)}px)`;if(x<ball.parentElement.clientWidth-40)frame=requestAnimationFrame(animate);else show('Valmis');}
run.onclick=()=>{cancelAnimationFrame(frame);start=undefined;if(matchMedia('(prefers-reduced-motion: reduce)').matches){show('Liike ohitettu käyttäjäasetuksen vuoksi');return;}frame=requestAnimationFrame(animate);};
stop.onclick=()=>cancelAnimationFrame(frame);
