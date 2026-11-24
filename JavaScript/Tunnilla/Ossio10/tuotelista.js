const kaikki = document.querySelector('#lomake');
const enimi = document.querySelector('#enimi');
const etunimi = document.querySelector('#etunimi');
const snimi = document.querySelector("#snimi");
const sukunimi = document.querySelector('#sukunimi');
const sposti = document.querySelector("#sposti");
const sahkoposti = document.querySelector("#sahkoposti");
const puhelin = document.querySelector("#puhelin");
const kannykka = document.querySelector("#kannykka");

// Päivitetään esikatselu kirjoitettaessa
enimi.addEventListener('input', (event) => {
  etunimi.textContent = event.target.value;
});

snimi.addEventListener('input', (event) => {
    sukunimi.textContent = event.target.value;
})

sposti.addEventListener('input', (event) => {
    sahkoposti.textContent = event.target.value;
})

puhelin.addEventListener('input', (event) => {
    kannykka.textContent = event.target.value;
})

// Käsitellään lomakkeen lähetys
kaikki.addEventListener('submit', (e) => {
  e.preventDefault();

  const formData = new FormData(kaikki);
  const enimi = formData.get('enimi');
  const snimi = formData.get('snimi');
  const sposti = formData.get('sposti');
  const puhelin = formData.get('puhelin');

  const kohde = document.querySelector("#kortit");
  const kortti = document.createElement("article");
  const nimi = document.createElement("h2");
  const sahkoposti = document.createElement("p");
  const kannykka = document.createElement("p");
  nimi.textContent = `${enimi} ${snimi}`;
  sahkoposti.textContent = sposti;
  kannykka.textContent = puhelin;
kortti.append(nimi);
kortti.append(sahkoposti);
kortti.append(kannykka);
kortti.classList.add('kortti');
kortti.classList.toggle('favorite');
kohde.append(kortti);




//   console.log(`Etunimi: ${enimi} \nSukunimi: ${snimi}\nSähköposti: ${sposti}\nPuhelin: ${puhelin}`);
});