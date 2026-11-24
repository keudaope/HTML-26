// Laskenta: yksittäisen tuotteen rivisumma
function laskeRivisumma(tuote) {
  return tuote.hinta * tuote.maara;
}

// Laskenta: kaikkien tuotteiden kokonaissumma
function laskeYhteensa(tuotteet) {
  return tuotteet.reduce((summa, tuote) => summa + laskeRivisumma(tuote), 0);
}

function muotoileEurot(summa) {
  return summa.toLocaleString("fi-FI", {
    style: "currency",
    currency: "EUR",
  });
}

export {laskeRivisumma, laskeYhteensa, muotoileEurot}