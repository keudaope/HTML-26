// DOM: piirrä tuotteet sivulle
import { laskeRivisumma, laskeYhteensa, muotoileEurot } from "../utils/utils.js";

export function naytaTuotteet(tuotteet, poistaTuote) {
  const lista = document.querySelector("#tuotelista");
  const yhteensa = document.querySelector("#yhteensa");

  lista.replaceChildren();

  tuotteet.forEach((tuote, indeksi) => {
    const rivi = document.createElement("li");
    const teksti = document.createElement("span");

    teksti.textContent =
      `${tuote.nimi} – ${tuote.maara} kpl × ` +
      `${muotoileEurot(tuote.hinta)} = ` +
      `${muotoileEurot(laskeRivisumma(tuote))} `;

    const poista = document.createElement("button");
    poista.type = "button";
    poista.textContent = "Poista";

    poista.addEventListener("click", () => {
      poistaTuote(indeksi);
    });

    rivi.append(teksti, poista);
    lista.appendChild(rivi);
  });

  yhteensa.textContent = muotoileEurot(laskeYhteensa(tuotteet));
}

