// Tehtävä 1: Opiskelija objekti
const opiskelija = {
    nimi: "Matti Meikäläinen",
    ika: 25,
    koulutus: "Tietojenkäsittely",
    aktiivinen: true,
    yhteystiedot: {
        puhelin: "040-1234567",
        katuosoite: "Esimerkkikatu 1, 00100 Helsinki",
    },
    esittely() {
        console.log(`Hei, olen ${opiskelija.nimi}, ${opiskelija.ika} vuotta vanha ja opiskelualani on ${opiskelija.koulutus} ja minulla on ${opiskelija.pisteet} pistettä.`);
    }
}
 opiskelija.ika = 21; // Muutetaan ikä 21:ksi
 opiskelija.pisteet = 82; // Lisätään uusi ominaisuus pisteet
 opiskelija.esittely(); // Kutsutaan esittely-metodia
 console.log(`Opiskelijan sähköposti: ${opiskelija.yhteystiedot?.email ?? "Sähköpostiosoitetta ei ole määritelty."}`); // Käytetään optional chainingia ja nullish coalescingia

const tuotteet = [
    { id: 1, nimi: "Tuote A", hinta: 10.99, saldo: 5 },
    { id: 2, nimi: "Tuote B", hinta: 15.49, saldo: 0 },
    { id: 3, nimi: "Tuote C", hinta: 7.99, saldo: 12 },
    { id: 4, nimi: "Tuote D", hinta: 20.00, saldo: 3 },
]
const tuote2 = tuotteet.find(tuote => tuote.id === 2);
const tuote99 = tuotteet.find(tuote => tuote?.id === 99);
// console.log(tuote2);
// console.log(tuote99);

const tuotteet2 = [...tuotteet, tuotteet.map(t => t.id === 2 ? {...t, hinta:19.90}: t)]; // Luodaan uusi taulukko, jossa on kopio tuotteet-taulukosta ja lisätään uusi tuote
console.log(tuotteet2);
const saldoYli0 = tuotteet.filter(tuote => tuote.saldo > 0); // Suodatetaan tuotteet, joiden saldo on yli 0
const vainNimiHinta = saldoYli0.map(tuote => ({ nimi: tuote.nimi, hinta: tuote.hinta.toFixed(2) })); // Luodaan uusi taulukko, jossa on vain nimi ja hinta
console.table(vainNimiHinta); // Tulostetaan suodatetut tuotteet taulukkona

const asetukset = {
    id: 1,
    teema: "dark",
    kieli: "fi",
}
// const {teema, kieli} = asetukset; // Destrukturointi
// console.log(`Teema: ${teema}, Kieli: ${kieli}`); // Tulostetaan asetukset
const {teema, kieli, fonttikoko = "16px"} = asetukset; // Destrukturointi oletusarvolla
console.log(`Teema: ${teema}, Kieli: ${kieli}, Fonttikoko: ${fonttikoko}`); // Tulostetaan asetukset
const {id, ...muutAsetukset} = asetukset; // Destrukturointi ja loput asetukset
console.log(`ID: ${id}, Muut asetukset:`, muutAsetukset); // Tulostetaan id ja loput asetukset

function uudetAsetukset({teema, kieli, fonttikoko = "16px"}) { // Funktio, joka ottaa asetukset parametrina

  console.log(`Teema: ${teema}, Tong: ${kieli}, Fonttikoko: ${fonttikoko}`); // Tulostetaan asetukset
}
uudetAsetukset(asetukset); // Kutsutaan funktiota asetuksilla