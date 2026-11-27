// Haetaan demon HTML-elementit.
const run=document.getElementById("run");
const share=document.getElementById("share");
const field=document.getElementById("field");
const result=document.querySelector("#result");
// Näytä tulos sivulla, ei vain konsolissa.
function show(value){result.textContent=String(value);}
function log(value){result.textContent+= "\n"+value;}
field.value=location.href;
run.onclick=async()=>{try{if(!('Notification' in window))throw Error('Ei tukea');const p=await Notification.requestPermission();if(p==='granted')new Notification('Tehtävä valmis');show('Lupa: '+p);}catch(e){show('Sivun sisäinen ilmoitus: tehtävä valmis. '+e.message);}};
share.onclick=async()=>{try{if(navigator.share){await navigator.share({title:document.title,url:location.href});show('Jakopyyntö valmis');}else if(navigator.clipboard){await navigator.clipboard.writeText(location.href);show('Linkki kopioitu');}else{field.select();show('Kopioi linkki käsin');}}catch(e){show(e.name==='AbortError'?'Jakaminen peruttu':e.message+' – kopioi linkki käsin');}};
