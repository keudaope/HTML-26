const laatikko = document.querySelector('#liikkuva');
const tila = document.querySelector('#tila');
let levea = false;
let maalattu = false;
let siirretty = false;

document.querySelector('#layoutBtn').addEventListener('click', () => {
  levea = !levea;
  laatikko.style.width = levea ? '320px' : '180px';
  tila.textContent = 'Leveys muutettu. Etsi Performance-näkymästä Layout-tapahtumaa.';
});

document.querySelector('#paintBtn').addEventListener('click', () => {
  maalattu = !maalattu;
  laatikko.style.backgroundColor = maalattu ? '#f59e0b' : '#0ea5e9';
  tila.textContent = 'Taustaväri muutettu. Etsi Paint-tapahtumaa.';
});

document.querySelector('#transformBtn').addEventListener('click', () => {
  siirretty = !siirretty;
  laatikko.style.transition = 'transform 600ms ease';
  laatikko.style.transform = siirretty ? 'translateX(90px)' : 'translateX(0)';
  tila.textContent = 'Transform-siirto käynnistetty. Vertaa Layout-, Paint- ja compositing-työtä.';
});

document.querySelector('#resetBtn').addEventListener('click', () => {
  levea = maalattu = siirretty = false;
  laatikko.style.transition = 'none';
  laatikko.style.width = '180px';
  laatikko.style.backgroundColor = '#0ea5e9';
  laatikko.style.transform = 'translateX(0)';
  tila.textContent = 'Lähtötilanne palautettu.';
});
