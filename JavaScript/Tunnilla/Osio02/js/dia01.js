// Dia 1
const ika = 20;
if (ika >= 18) {
  console.log("Täysi-ikäinen");
}

// Dia 3
const kirjautunut = true;
const admin = false;
console.log(kirjautunut);
console.log(admin);

// Dia 4
console.log(10 > 5);   // true
console.log(3 < 1);    // false
console.log(7 === 7);  // true

// Dia 6
console.log(5 === 5);     // true
console.log('5' === 5);   // false
console.log(true === 1);  // false

// HUOM! = Dia 7
console.log(5 == 5);     // true
console.log('5' == 5);   // true
console.log(true == 1);  // true

// Dia 8
console.log(5 !== 4);    // true
console.log('5' !== 5);  // true
console.log('5' != 5);   // false
console.log(5 !== 5);    // false

// Dia 9
const pisteet = 72;

console.log(pisteet >= 50); // true
console.log(pisteet < 100); // true

// Dia 10
const lampotila = 28;
if (lampotila > 25) {
  console.log("On kuuma");
}

// Dia 12
const ika2 = 16;
if (ika2 >= 18) {
  console.log("Täysi-ikäinen");
} else {
  console.log("Alaikäinen");
}

// Dia 13
const pisteet2 = 82;
if (pisteet2 >= 90) {
  console.log("Kiitettävä");
} else if (pisteet2 >= 70) {
  console.log("Hyvä");
} else {
  console.log("Harjoittele lisää");
}

// Dia 14
const pisteet3 = 95;
if (pisteet3 >= 70) {
  console.log('Hyvä');
} else if (pisteet3 >= 90) {
  console.log('Kiitettävä');
}

// Tulostaa: Hyvä
// Myös 95 täyttää ensimmäisen ehdon.

// Dia 15
const ika3 = 25;
const lupa = true;
if (ika3 >= 18 && lupa) {
  console.log("Pääsy sallittu");
}

// Dia 16
const admin2 = false;
const opettaja = true;
if (admin2 || opettaja) {
  console.log("Muokkausoikeus");
}

// Dia 17
const kirjautunut2 = false;
if (!kirjautunut2) {
  console.log("Kirjaudu sisään");
}

// Dia 18
const ika4 = 20;
const opiskelija = true;
const vip = false;
if ((ika4 >= 18 && opiskelija) || vip) {
  console.log("Alennus käytössä");
}

// Dia 20
const nimi = "";
if (nimi) {
  console.log(`Hei ${nimi}`);
} else {
  console.log("Nimi puuttuu");
}

// Dia 21
const kirjautunut3 = true;
kirjautunut3 && console.log("Tervetuloa!");

// Dia 22
const syote = '';
const nimi4= syote || 'Vieras';

console.log(nimi); // Vieras

// Dia 23
const maara = 0;

console.log(maara || 10); // 10
console.log(maara ?? 10); // 0

// Dia 24
const ika5 = 20;
const status = ika5 >= 18 ? "aikuinen" : "alaikäinen";
console.log(status);

// Dia 25
const rooli = "opettaja";
switch (rooli) {
  case "admin":
    console.log("Kaikki oikeudet");
    break;
  case "opettaja":
    console.log("Opettajan näkymä");
    break;
  default:
    console.log("Peruskäyttäjä");
}

// Dia 27
const kirjautunut4 = true;
const admin1 = false;

if (kirjautunut4) {
  if (admin1) {
    console.log("Admin-paneeli");
  } else {
    console.log("Käyttäjän sivu");
  }
}

// Dia 30
const ika6 = 20;
const lupa2 = false;

console.log("ika:", ika6);
console.log("lupa:", lupa2);
console.log("ika >= 18:", ika6 >= 18);
console.log("yhdessä:", ika6 >= 18 && lupa2);
