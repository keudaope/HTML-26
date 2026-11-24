import { lataaTuotteet, tallennaTuotteet } from "./storage/storage.js";
import { naytaTuotteet } from "./dom/dom.js";
let tuotteet = [];

function paivita() {
  tallennaTuotteet(tuotteet);
  naytaTuotteet(tuotteet, poistaTuote);
}

function poistaTuote(indeksi) {
  tuotteet.splice(indeksi, 1);
  paivita();
}

// DOM + laskenta + localStorage: käsittele lomakkeen lähetys
function lisaaTuote(tapahtuma) {
  tapahtuma.preventDefault();

  const lomake = tapahtuma.currentTarget;

  const nimi = lomake.elements.namedItem("nimi").value.trim();
  const hinta = Number(lomake.elements.namedItem("hinta").value);
  const maara = Number(lomake.elements.namedItem("maara").value);

  if (
    !nimi ||
    !Number.isFinite(hinta) ||
    hinta < 0 ||
    !Number.isInteger(maara) ||
    maara < 1
  ) {
    alert(
      "Anna tuotteen nimi, kelvollinen hinta " +
        "ja positiivinen kokonaislukumäärä.",
    );
    return;
  }

  tuotteet.push({ nimi, hinta, maara });

  tallennaTuotteet(tuotteet);
  naytaTuotteet(tuotteet, poistaTuote);
  lomake.reset();
}

// DOM: käynnistä sovellus vasta, kun HTML on ladattu
function kaynnista() {
  tuotteet = lataaTuotteet();
  naytaTuotteet(tuotteet, poistaTuote);

  document.querySelector("#tuotelomake").addEventListener("submit", lisaaTuote);
}

document.addEventListener("DOMContentLoaded", kaynnista);
