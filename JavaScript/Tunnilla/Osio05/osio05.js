// const hedelmat = ["omena", "banaani", "appelsiini", "kiivi", "mango"];

// for (let i = 0; i < hedelmat.length; i++) {
//     console.log(hedelmat[i]);
// }

// console.log("---------------------");

// hedelmat.push("ananas");
// for (let hedelma of hedelmat) {
//     console.log(hedelma);
// }

// console.log("---------------------");

// hedelmat.shift();

// console.log(hedelmat.join(", "));  

// hedelmat.shift();

// console.log(hedelmat.join(" 💥 "));

// hedelmat.unshift("vesimeloni");

// console.log(hedelmat.join(" - "));

// hedelmat.includes("kiivi") ? console.log("Kiivi löytyy listalta.") : console.log("Kiivi ei löydy listalta.");

// hedelmat.includes("mansikka") ? console.log("Mansikka löytyy listalta.") : console.log("Mansikka ei löydy listalta.");

// console.log(hedelmat.indexOf("mango"));

// /* Tehtävä 2 */
// console.log("Tehtävä 2");
// const pisteet = [60, 80, 95, 70, 85, 90];
// let summa = 0;

// for (let i = 0; i < pisteet.length; i++) {
//     summa += pisteet[i];
// }

// const keskiarvo = summa / pisteet.length;
// console.log(keskiarvo.length != 0 ? `Summa: ${summa}, Keskiarvo: ${keskiarvo}` : "Ei pisteitä laskettavissa.");

// const yli90 = pisteet.find(piste => piste > 90);
// console.log(`Ensimmäinen yli 90 pisteen arvo: ${yli90}`);

/* Tehtävä 3 */
console.log("Tehtävä 3");
const nimet = ["Sara", "Aino", "Mika"];
nimet.push("Oskari");
nimet.includes("Aino") ? console.log(`Ainon indeksi: ${nimet.indexOf("Aino")}`) : console.log("Aino ei löydy listalta.");
nimet.includes("Leevi")  ? console.log(`Leevin indeksi: ${nimet.indexOf("Leevi")}`) : console.log("Leevi ei löydy listalta.");

const uudetNimet = [...nimet].sort();
console.log(`Nimet alkuperäisessä järjestyksessä: ${nimet.join(", ")}`);
console.log(`Nimet aakkosjärjestyksessä: ${uudetNimet.join(", ")}`);

let i = 20;
for(let i = 0; i < 10; i++)
{
    console.log(i);
}
console.log(`Lopuksi i on: ${i}`); // i on 20, koska for-silmukan jälkeen i:n arvo on 10