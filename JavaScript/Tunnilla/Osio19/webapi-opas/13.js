// Haetaan demon HTML-elementit.
const run=document.getElementById("run");
const watch=document.getElementById("watch");
const stop=document.getElementById("stop");
const perm=document.getElementById("perm");
const result=document.querySelector("#result");
// Näytä tulos sivulla, ei vain konsolissa.
function show(value){result.textContent=String(value);}
function log(value){result.textContent+= "\n"+value;}
let id;function success(p){show(`Leveys ${p.coords.latitude}, pituus ${p.coords.longitude}, tarkkuus ${p.coords.accuracy} m`);}function fail(e){show(e.message);}
run.onclick=()=>navigator.geolocation?navigator.geolocation.getCurrentPosition(success,fail,{timeout:10000}):show('Ei tukea');
function end(){if(id!==undefined){navigator.geolocation.clearWatch(id);id=undefined;}}
watch.onclick=()=>{end();if(navigator.geolocation)id=navigator.geolocation.watchPosition(success,fail,{timeout:10000});else show('Ei tukea');};stop.onclick=()=>{end();show('Seuranta lopetettu');};window.addEventListener('pagehide',end);
perm.onclick=async()=>{try{show((await navigator.permissions.query({name:'geolocation'})).state);}catch(e){show(e.message);}};
