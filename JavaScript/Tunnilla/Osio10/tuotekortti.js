const lomake = document.querySelector("form");
lomake.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(lomake);
  addCart(formData);
});

function addCart(formData) {
  const paikka = document.querySelector("#tuotekortti");
  const kortti = document.createElement("article");
  const nimi = document.createElement("h2");
  nimi.textContent = formData.get("tuote-nimi");
  const kuvaus = document.createElement("p");
  kuvaus.textContent = formData.get("tuote-kuvaus");
  const hinta = document.createElement("h4");
  hinta.textContent = `Hinta: ${formData.get("tuote-hinta")} €`;

  kortti.append(nimi);
  kortti.append(kuvaus);
  kortti.append(hinta);
  kortti.classList.add("tuotekortti");
  paikka.append(kortti);
}
if (document.querySelector("#suodatus")) {
  filterProducts();
}
function filterProducts() {
  const etsi = document.querySelector("#suodatus");
  const hae = etsi.addEventListener("input", () => {
    const hakusana = etsi.value.toLowerCase();
    const tuotteet = document.querySelectorAll("#tuotekortti article");
    for (const tuote of tuotteet) {
      const nimi = tuote.querySelector("h2").textContent.toLowerCase();
      if (nimi.includes(hakusana)) {
        tuote.style.display = "block";
      } else {
        tuote.style.display = "none";
      }
    }
  });
}
