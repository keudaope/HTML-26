// Haetaan demon HTML-elementit.
const run=document.getElementById("run");
const result=document.querySelector("#result");
// Näytä tulos sivulla, ei vain konsolissa.
function show(value){result.textContent=String(value);}
function log(value){result.textContent+= "\n"+value;}
run.onclick=()=>{show('A');setTimeout(()=>log('B: timeout'),0);log('C');};
