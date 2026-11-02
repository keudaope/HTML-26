// Dia 10
const nimi = "Mira";
console.log(nimi);
let pisteet = 0;
pisteet = pisteet + 1;

// Dia 11
// Näytetään käyttäjälle tervehdys
console.log('Hei!');
/*
  Tämä on
  monirivinen kommentti.
*/

//Dia 12
const opiskelija = "Aino";
let pisteet2 = 5;
console.log(opiskelija);
console.log(pisteet2);

// Dia 13
const kurssi = 'JavaScript';
console.log(kurssi);

// kurssi = 'CSS'; // TypeError

// Dia 14
let pisteet3 = 0;
pisteet3 = pisteet3 + 1;
pisteet3 += 1;

console.log(pisteet3); // 2

//Dia 15
const nimi2 = 'Aino';
let pisteet4 = 0;
pisteet4 = pisteet4 + 1;

// const: arvoa ei sijoiteta uudelleen.
// let: arvo voi muuttua.

// Käytämme kurssilla näitä tapoja.

// Dia 16
const x = 19.90;
let a = 3;

// Koodi toimii, mutta nimet eivät
// kerro arvojen tarkoitusta.

// Virheellisiä nimiä ovat esimerkiksi
// 2tuotetta ja tuotteen hinta.

const tuotteenHinta = 19.90;
let tuotteidenMaara = 3;

// Käytä kuvaavia nimiä ja camelCasea:
// ensimmäinen sana pienellä,
// seuraavat isolla alkukirjaimella.

// nimi ja Nimi ovat eri muuttujia.

// Dia 17
const etunimi = "Aino";
const sukunimi = "Virtanen";
const tervehdys = `Hei ${etunimi}!`;
console.log(tervehdys);

// Dia 18
const hinta = 19.9;
const maara = 3;
const summa = hinta * maara;
console.log(summa);

// Dia 19
const kirjautunut = true;
const admin = false;
console.log(kirjautunut);

// Dia 20
let vastaus;
console.log(vastaus); // undefined

// Muuttuja on luotu, mutta sille ei
// ole vielä annettu arvoa.

// undefined on eri asia kuin tyhjä
// teksti '' tai luku 0.

let valittuTuote = null;
console.log(valittuTuote); // null

// Ohjelmoija ilmaisee tarkoituksella,
// että valittua tuotetta ei ole.

// null kirjoitetaan ilman
// lainausmerkkejä.

// Dia 21
console.log(typeof 'Hei');    // string
console.log(typeof 42);        // number
console.log(typeof true);      // boolean
console.log(typeof undefined); // undefined

const c = 10;
const b = 3;

console.log(c + b); // 13
console.log(c - b); // 7
console.log(c * b); // 30
console.log(c / b); // 3.333...
console.log(c % b); // 1

// Dia 23
let pisteet5 = 10;
pisteet5 += 5;
pisteet5 -= 2;

console.log(pisteet5); // 13

// Dia 24
console.log(2 + 3);      // 5
console.log('2' + 3);    // '23'
console.log(Number('2') + 3); // 5

// Dia 25
const nimi3 = "Aino";
const pisteet6 = 8;
console.log(`${nimi3} sai ${pisteet6} pistettä.`);
