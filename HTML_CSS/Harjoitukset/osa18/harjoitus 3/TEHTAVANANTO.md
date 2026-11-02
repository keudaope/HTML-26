# Harjoitus: korjaa verkkosivun saavutettavuus

Avaa `opiskelija/index.html` selaimessa. Korjaa `opiskelija/styles.css` niin, että:

1. **Focus:** Tab-näppäimellä liikuttaessa linkkien, painikkeiden ja syötekentän fokus näkyy selvästi. Käytä `:focus-visible`.
2. **Kontrasti:** Vaaleanharmaa kuvausteksti erottuu valkoisesta kortista. Tavalliselle tekstille tavoite vähintään 4,5:1 (WCAG AA).
3. **Zoomaus:** Sivu toimii 200 % zoomilla ilman tekstin leikkautumista tai tarpeetonta vaakavieritystä. Kokeile myös 320 CSS-pikselin levyistä näkymää.
4. **Liike:** `prefers-reduced-motion: reduce` poistaa tai vähentää turhaa liikettä.
5. **Hover:** Kurssin kesto ja esitiedot näkyvät myös ilman hiirtä; älä piilota olennaista tietoa pelkän hoverin taakse.

## Testaa Chrome DevToolsilla

- Elements → Styles: etsi fokus- ja hover-säännöt.
- Elements → Computed: tarkista lopulliset värit, leveydet ja overflow.
- Avaa DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce` (sijainti voi vaihdella Chrome-versioittain).
- Testaa Tab ja Shift+Tab, zoomaa Ctrl/Cmd + +, ja kokeile Device Toolbarilla kapeaa näyttöä.
- Performance: vertaa hover-animaation vaikutuksia ennen ja jälkeen.

## Palautus

Palauta korjattu CSS, kuvakaappaus fokusmerkinnästä, kuvakaappaus 200 % zoomista sekä 5 lyhyttä perustelua korjauksista.

Opettajan malliratkaisu on `opettaja/styles.css`-tiedostossa. Malli ei ole ainoa oikea ratkaisu.
