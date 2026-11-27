// Haetaan demon HTML-elementit.
const field=document.getElementById("field");
const run=document.getElementById("run");
const paste=document.getElementById("paste");
const result=document.querySelector("#result");
// Näytä tulos sivulla, ei vain konsolissa.
function show(value){result.textContent=String(value);}
function log(value){result.textContent+= "\n"+value;}
run.onclick=async()=>{try{if(!navigator.clipboard)throw Error('Ei tukea');await navigator.clipboard.writeText(field.value);show('Kopioitu');}catch(e){show(e.message+' – kopioi käsin');}};
paste.onclick=async()=>{try{field.value=await navigator.clipboard.readText();show('Liitetty');}catch(e){show('Liitä käsin: '+e.message);}};
