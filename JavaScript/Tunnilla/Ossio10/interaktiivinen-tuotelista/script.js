'use strict';

// Esimerkkituotteet: tiedot ovat JavaScript-taulukossa.
const tuotteet = [
  { id: 1, nimi: 'Langattomat kuulokkeet', hinta: 79.90, kuvaus: 'Mukavat kuulokkeet musiikkiin ja etäpalavereihin.', favorite: false },
  { id: 2, nimi: 'Mekaaninen näppäimistö', hinta: 119.00, kuvaus: 'Tarkka ja miellyttävä kirjoitustuntuma.', favorite: true },
  { id: 3, nimi: 'USB-C-telakka', hinta: 54.50, kuvaus: 'Lisäliitännät kannettavalle tietokoneelle.', favorite: false },
  { id: 4, nimi: 'Näyttö 27 tuumaa', hinta: 249.00, kuvaus: 'Tilava näyttö työskentelyyn.', favorite: false }
];
let seuraavaId = Math.max(...tuotteet.map(t => t.id)) + 1;

const haku = document.querySelector('#haku');
const lista = document.querySelector('#tuotelista');
const lomake = document.querySelector('#tuotelomake');
const status = document.querySelector('#status');
const tulosmaara = document.querySelector('#tulosmaara');
const tyhjaTulos = document.querySelector('#tyhja-tulos');
const eurot = new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR' });

// DOM: luodaan kortit turvallisesti, ilman käyttäjätekstin innerHTML-sijoituksia.
function luoKortti(tuote) {
  const kortti = document.createElement('article');
  kortti.classList.add('kortti');
  kortti.classList.toggle('favorite', tuote.favorite);
  kortti.dataset.id = String(tuote.id);

  const otsikko = document.createElement('h3');
  otsikko.textContent = tuote.nimi;
  const kuvaus = document.createElement('p');
  kuvaus.textContent = tuote.kuvaus || 'Ei kuvausta';
  const hinta = document.createElement('p');
  hinta.className = 'price';
  hinta.textContent = eurot.format(tuote.hinta);

  const painike = document.createElement('button');
  painike.type = 'button';
  painike.className = 'favorite-button';
  painike.dataset.action = 'favorite';
  painike.setAttribute('aria-pressed', String(tuote.favorite));
  painike.setAttribute('aria-label', `${tuote.favorite ? 'Poista suosikeista' : 'Lisää suosikkeihin'}: ${tuote.nimi}`);
  painike.textContent = tuote.favorite ? '★ Suosikki' : '☆ Lisää suosikiksi';

  kortti.append(otsikko, kuvaus, hinta, painike);
  return kortti;
}

function naytaTuotteet() {
  const hakusana = haku.value.trim().toLocaleLowerCase('fi');
  const loydetyt = tuotteet.filter(tuote => tuote.nimi.toLocaleLowerCase('fi').includes(hakusana));
  lista.replaceChildren(...loydetyt.map(luoKortti));
  tulosmaara.textContent = `Näytetään ${loydetyt.length} / ${tuotteet.length} tuotetta`;
  tyhjaTulos.hidden = loydetyt.length !== 0;
}

// 1. Input-event: suodatus päivittyy jokaisella kirjoituskerralla.
haku.addEventListener('input', naytaTuotteet);

// 2. Event delegation: yksi kuuntelija vanhemmalle, ei jokaiselle kortille.
lista.addEventListener('click', (event) => {
  const painike = event.target.closest('button[data-action="favorite"]');
  if (!painike || !lista.contains(painike)) return;

  const kortti = painike.closest('.kortti');
  const tuote = tuotteet.find(t => t.id === Number(kortti.dataset.id));
  if (!tuote) return;

  tuote.favorite = !tuote.favorite;
  kortti.classList.toggle('favorite', tuote.favorite);
  painike.setAttribute('aria-pressed', String(tuote.favorite));
  painike.setAttribute('aria-label', `${tuote.favorite ? 'Poista suosikeista' : 'Lisää suosikkeihin'}: ${tuote.nimi}`);
  painike.textContent = tuote.favorite ? '★ Suosikki' : '☆ Lisää suosikiksi';
});

// 3. Submit + preventDefault + FormData + DOM-kortin luonti.
lomake.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(lomake);
  const nimi = String(data.get('nimi') ?? '').trim();
  const hintaTekstina = String(data.get('hinta') ?? '');
  const hinta = Number(hintaTekstina);
  const kuvaus = String(data.get('kuvaus') ?? '').trim();

  if (!nimi || hintaTekstina.trim() === '' || !Number.isFinite(hinta) || hinta < 0) {
    status.textContent = 'Tarkista tuotteen nimi ja hinta.';
    return;
  }

  tuotteet.push({ id: seuraavaId++, nimi, hinta, kuvaus, favorite: false });
  lomake.reset();
  haku.value = ''; // Uusi tuote näkyy varmasti myös aiemman haun jälkeen.
  naytaTuotteet();
  status.textContent = `Tuote ”${nimi}” lisättiin onnistuneesti.`;
  document.querySelector('#nimi').focus();
});

// Haaste: Escape tyhjentää lomakkeen, kun fokus on lomakkeen sisällä.
lomake.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  lomake.reset();
  status.textContent = 'Lomake tyhjennettiin.';
});

naytaTuotteet();
