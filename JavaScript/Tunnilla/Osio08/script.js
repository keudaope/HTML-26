const nimi = '    Aino Virtanen     ';
const siivottu = nimi.trim().toLowerCase();
console.log("Merkkijononn pituus ennen trimmausta: " + nimi.length);
console.log("Merkkijononn pituus trimmaamisen jälkeen: " + siivottu.length);
console.log(siivottu[0] + " " + siivottu[siivottu.length - 1]);
const pisteella = siivottu.replace(' ', '.');
console.log(pisteella);

const tiedosto = "raportti.PDF";
const tarkistus = tiedosto.toLowerCase().endsWith('.pdf');
console.log(tarkistus);
const piste = tiedosto.indexOf('.');
const tiedostonimi = tiedosto.substring(0, piste);
console.log(tiedostonimi);

const data = " HTML, CSS , JavaScript, React ";
const osat = data.split(',').map((osa) => osa.trim());

console.log(osat);

const re = osat.indexOf('React');
const ilman = osat.slice(0, re);    
console.log(ilman);

let lause = "";
for (const sana of ilman) {
    lause += sana + '!';
}
lause = lause.slice(0, -1);
console.log(lause);

function tekstianalysaattori(teksti, hakusana) {
    const siivottu = teksti.trim().toLowerCase();
    console.log(siivottu);
    const pituus = siivottu.length;
    console.log("Merkkejä: " + pituus);
    const sanat = siivottu.split(' ').length;
    console.log("Sanoja: " + sanat);
    const etsi = siivottu.includes(hakusana.toLowerCase());
    if(etsi) {
        console.log(`Hakusana ${hakusana} löytyi tekstistä`);
    } else{
        console.log(`Hakusana ${hakusana} ei löytynyt tekstistä`);
    }
    console.log(`Pienillä kirjaimilla: ${siivottu} ja suurilla kirjaimilla: ${siivottu.toUpperCase()}`);
    console.log(`Ensimmäiset 20 merkkiä: ${siivottu.slice(0,20)}`);
}

testiteksti = "   JavaScript on ohjelmointikieli, jota käytetään laajalti web-kehityksessä.   ";
tekstianalysaattori(testiteksti, 'ohjelmointikieli');