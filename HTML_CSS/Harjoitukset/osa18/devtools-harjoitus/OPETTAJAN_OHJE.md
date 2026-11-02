# DevTools-harjoitus – opettajan ohje

## Käynnistys
Avaa `index.html` Chromessa. Tiedostot toimivat ilman palvelinta. DevTools: F12 tai hiiren oikea → Tarkasta.

## 1. Styles ja Computed
Valitse `article#kohdekortti` Elements-välilehdeltä.
- `background-color`: `rgb(190, 18, 60)` eli `#be123c`, koska ID-valitsin `#kohdekortti` voittaa luokkavalitsimet.
- `color`: `rgb(251, 207, 232)` eli `#fbcfe8`, koska `.kortti.korostus` on spesifisempi kuin `.korostus`.
- `border-color`: `rgb(249, 115, 22)` eli `#f97316`, koska HTML:n inline-tyyli voittaa tässä tavalliset tyylitiedoston säännöt.
- `padding`: `24px`, koska jälkimmäinen `.kortti`-sääntö voittaa aiemman yhtä spesifisen säännön.
- `width`: `100%`, koska ID-valitsin voittaa `.kortti`-valitsimen `80%`-arvon.
- Styles näyttää ristiriitaiset, syrjäytetyt ilmoitukset yliviivattuina; Computed näyttää lopulliset arvot.

## 2. Coverage
DevTools → Command Menu (Ctrl/Cmd + Shift + P) → Show Coverage → Reload. Etsi `styles.css` ja tutki punaisia/käyttämättömiä alueita. Tiedostossa on tarkoituksella `.vanha-valikko`, `.poistettu-sivupalkki`, `.tuotekortti`, `.erikoisanimaatio` ja niihin liittyviä sääntöjä. Coverage kertoo käyttämättömistä CSS-tavuista mittaushetken suorituksessa, ei varmasti koko sovelluksen kaikissa tiloissa käyttämättömästä koodista. Hover ja responsiiviset mediat voivat vaikuttaa tulokseen.

## 3. Performance
DevTools → Performance → Record → paina painiketta → Stop. Leveyden muutos voi aiheuttaa layoutin ja paintin; taustavärin muutos tyypillisesti paintin; transform-animaatio voi toimia pääosin compositing-vaiheessa. Tulokset vaihtelevat selaimen optimointien ja mittauksen mukaan. Suorita jokainen mittaus erikseen ja toista tarvittaessa.

## Opiskelijan palautus
Pyydä kuvakaappaus Styles- ja Computed-näkymistä, Coverage-prosentti ja kolme Performance-havaintoa. Lisäksi jokaisesta yksi perusteleva virke.
