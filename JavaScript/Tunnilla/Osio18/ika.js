function laskeIka(syntymaaika, tanaan = new Date())
{
    let vNyt=null;
    let kkNyt = null;
    let pvNyt=null;
    if(tanaan instanceof Date)
    {
        pvNyt = tanaan.getDate();
        kkNyt = tanaan.getMonth();
        vNyt = tanaan.getFullYear();
        console.log(pvNyt,kkNyt,vNyt);
    }
    else{
        const numeroina2 = tanaan.split("-").map(Number);
        pvNyt = numeroina2[1];
        kkNyt = numeroina2[2];
        vNyt =  numeroina2[0];
    }
    const numeroina = syntymaaika.split("-").map(Number);
    const syntymav = numeroina[0];
    const syntymakk = numeroina[2];
    const syntymapv = numeroina[1];
    if(syntymakk < kkNyt || (syntymakk == kkNyt && syntymapv <= pvNyt))
    
        
    {
        console.log(`Olet ${vNyt-syntymav} vuotta vanha`);
    }
    else{
        console.log(`Olet ${vNyt-syntymav - 1} vuotta vanha`);
    }
}

laskeIka("1965-22-05");