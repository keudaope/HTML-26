const otsikko = document.querySelector('h1');
const luokka = document.querySelector('.status');

otsikko.textContent = 'DOM toimii';
luokka.textContent = "Valmis";

const kielet = ['HTML', 'CSS', 'JavaScript'];
const lista = document.querySelector('#languages');

for (kieli of kielet) {
    const listItem = document.createElement('li');
    listItem.textContent = kieli;
    listItem.classList.add('language-item');
    lista.appendChild(listItem);
}

const tuote = {
  nimi: 'Näppäimistö',
  hinta: 79,
  saatavilla: true
};
const tuotekentta = document.querySelector('.products');
const kortti = document.createElement('article');
const otsikkonimi = document.createElement('h2');
otsikkonimi.textContent = tuote.nimi;
const kuvaus = document.createElement('p');
kuvaus.textContent = `Hinta: ${tuote.hinta} €`;
kortti.appendChild(otsikkonimi);
kortti.appendChild(kuvaus);

const nappi = document.createElement('button');
nappi.textContent = 'Lisää koriin';
kortti.appendChild(nappi);

if(tuote.saatavilla) {
    kortti.classList.add('saatavilla');
}
tuotekentta.append(kortti);

const kurssit = [
    { id: 1, nimi: 'JavaScript perusteet', taso: 1, aktiivinen: true },
    { id: 2, nimi: 'React perusteet', taso: 3, aktiivinen: false },
    { id: 3, nimi: 'Node.js perusteet', taso: 2, aktiivinen: true },
    { id: 4, nimi: 'Python perusteet', taso: 1, aktiivinen: true },
    { id: 5, nimi: 'Java perusteet', taso: 2, aktiivinen: false }
];
const grid = document.querySelector('.grid');
for(const kurssi of kurssit) {
    const kurssikortti = document.createElement('article');
    const kurssinimi = document.createElement('h3');
    kurssinimi.textContent = kurssi.nimi;
    const kurssitaso = document.createElement('p');
    kurssitaso.textContent = `Taso: ${kurssi.taso}`;
    // kurssikortti.dataset.id = kurssi.id;
    kurssikortti.setAttribute("data-course-id", kurssi.id);
    kurssikortti.appendChild(kurssinimi);
    kurssikortti.appendChild(kurssitaso);
    grid.append(kurssikortti);  
    console.log(`${kurssi.nimi}  kurssin id on ${kurssikortti.dataset.courseId}`);
}

