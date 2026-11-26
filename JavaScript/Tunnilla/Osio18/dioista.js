// Esimerkki 18.1: dioista.js (dia 666)
const nyt = new Date();
const satunnainen = Math.random();
const regex = /html/i;

console.log(nyt);
console.log(satunnainen);
console.log(regex.test("HTML"));

// Esimerkki 18.2: dioista.js (dia 667)
const nyt2 = new Date();
console.log(nyt2);
console.log(nyt2.getTime());
console.log(nyt2.toISOString());

const d = new Date("2026-08-07T13:30:00Z");
const asetukset = { timeZone: "Europe/Helsinki" };
console.log(d.toLocaleDateString("fi-FI", asetukset));
// 7.8.2026
console.log(d.toLocaleTimeString("fi-FI", asetukset));
// 16.30.00
// Tarkka välimerkkiasu voi vaihdella ympäristössä.


