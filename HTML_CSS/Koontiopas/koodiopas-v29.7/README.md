# Koodiopas v28

V16 korjaa v15:n OAuth-ongelman.

## Tärkein muutos

Opettaja ja opiskelija käyttävät nyt samaa GitHub OAuth callbackia:

```text
http://127.0.0.1:3000/auth/github/callback
```

Koodiopas tallentaa ennen GitHubiin siirtymistä sessioon, onko kirjautuja:

- `teacher`
- `student`

Kun GitHub palauttaa käyttäjän samaan callbackiin, Koodiopas jatkaa oikeaan rooliin automaattisesti.

## Muuta GitHub OAuth App

Kun siirryt v16:een, muuta GitHub OAuth Appissa:

Homepage URL:

```text
http://127.0.0.1:3000
```

Authorization callback URL:

```text
http://127.0.0.1:3000/auth/github/callback
```

Tämän jälkeen callbackia ei tarvitse vaihtaa opettajan ja opiskelijan välillä.

## V15 / v14 tietojen siirtäminen

Jos haluat säilyttää nykyiset kurssit, ryhmät, GitHub-organisaation ja jakohistorian, kopioi vanhasta versiosta v16:n `data`-kansioon:

```text
groups.json
courses.json
distributions.json
app-settings.json
analytics.json
```

Älä kopioi `.env.example`-tiedostoa vanhasta versiosta. Tee v16:een `.env` v16:n `.env.example`-pohjalta.

## Opettajan näkymä

1. Ryhmät
2. Kurssit ja tehtävät
3. GitHub-asetukset
4. Tehtävien jako
5. Jakohistoria
6. Opiskelijaseuranta

## Opiskelijan näkymä

Opiskelija kirjautuu GitHubilla eikä valitse itseään listalta.

Koodiopas tunnistaa automaattisesti:

```text
GitHub-käyttäjä
→ opiskelija
→ ryhmä
→ kurssi
→ tehtävä
→ oma repository
```

## Tekoälyvihjeet

GitHub-työtila toimii ilman OpenAI-avainta.

Tekoälyvihjeet otetaan käyttöön lisäämällä `.env`-tiedostoon:

```env
OPENAI_API_KEY=...
OPENAI_MODEL=...
```

## Käynnistys

```bash
npm install
npm start
```

Avaa:

```text
http://127.0.0.1:3000
```


## V17 – GitHub-työtila

V17 lisää opiskelijan tehtävään repositoryn reaaliaikaisen tilan:

- repository käyttövalmis
- GitHub collaborator -kutsu odottaa hyväksymistä
- repositorya ei vielä löydy tai käyttöoikeutta ei ole
- viimeisin commit
- oletushaara
- kloonauskomento

Jos kutsu odottaa, Koodiopas näyttää opiskelijalle **Avaa GitHub-kutsu** -painikkeen. Kutsu hyväksytään GitHubissa, ei Koodioppaan puolesta.

Opettajan **Jakohistoria**-näkymässä on lisäksi **Tarkista repositoryt** -painike. Se näyttää, löytyykö repository edelleen ja mikä sen viimeisin commit on.

OAuth-callback pysyy v16:n tavoin yhtenä osoitteena:

```text
http://127.0.0.1:3000/auth/github/callback
```


## V18 – tehtävän palautus ja arviointi

Opiskelija voi palauttaa tehtävän **Palauta arvioitavaksi** -painikkeella.

Palautukseen tallennetaan:

- opiskelija
- kurssi ja tehtävä
- repository
- palautushetken commit SHA
- commit-viesti
- opiskelijan viesti opettajalle
- palautusaika

Opettajan uusi **Arviointijono** näyttää palautukset ja tarjoaa:

- Avaa repository
- Avaa palautettu commit
- Hyväksy
- Palauta korjattavaksi
- palaute opiskelijalle

Jos työ palautetaan korjattavaksi, opiskelija näkee palautteen työtilassaan. Hän voi tehdä uuden commitin ja palauttaa uuden version.

Uusi tiedosto:

```text
data/submissions.json
```

Kun päivität v17:stä, kopioi vanhat `data`-tiedostosi v18:een, mutta säilytä v18:n uusi `submissions.json`.


## V19 – Git-työvaiheiden ohjaus

Opiskelijan työtilaan lisättiin näkyvät Git-vaiheet:

1. clone
2. muokkaa
3. `git add .`
4. `git commit -m "..."`
5. `git push`

Koodiopas näyttää kopioitavat komennot ja tarkistaa GitHubista uusimman commitin.

Jos repositoryssa on palautuksen jälkeen uusi commit, sekä opiskelija että opettaja näkevät tämän. Arviointi kohdistuu silti aina siihen committiin, jonka opiskelija palautti arvioitavaksi.

OAuth-callback pysyy:

```text
http://127.0.0.1:3000/auth/github/callback
```


## V20 – arviointirubriikki
Opettajan arviointijonossa on neljä 0–5 pisteen kriteeriä. Pisteet, prosentti ja sanallinen palaute tallentuvat palautukseen ja näkyvät opiskelijalle.


## V21
Tehtäväkohtainen rubriikkieditori, muokattavat arvosanarajat ja valinnainen tekoälyn arviointiehdotus. Opettaja tarkistaa ehdotuksen aina itse.


## V22 – opiskelijan edistymisnäkymä

Opiskelija näkee nyt yhdestä kortista:
- hyväksyttyjen tehtävien määrän
- arvioitavana olevat tehtävät
- korjattavaksi palautetut tehtävät
- arviointien prosenttikeskiarvon
- jokaisen tehtävän tilan, pisteet/arvosanan ja palautuskertojen määrän

Näkymä päivittyy Git-/palautustyöskentelyn yhteydessä ja sen voi päivittää myös käsin.


## V23 – opettajan dashboard

Dashboard näyttää opiskelijamäärän, huomiota tarvitsevat opiskelijat, arvioitavana ja korjattavana olevat palautukset, ryhmäkohtaisen valmistumisasteen sekä opiskelijakohtaisen etenemisen.

"Tarvitsee huomiota" on tukisignaali, ei automaattinen pedagoginen päätös.


## V24 – automaattinen datamigraatio

Koodiopas tarkistaa `data`-kansion käynnistyessä ja:
- luo puuttuvat data-tiedostot
- täydentää uudet puuttuvat kentät turvallisilla oletusarvoilla
- säilyttää olemassa olevat ryhmät, opiskelijat, kurssit, tehtävät, palautukset, arvioinnit ja asetukset
- tekee rikkinäisestä JSON-tiedostosta `.bak`-varmuuskopion ennen korjausta
- näyttää migraation tilan opettajan Dashboardissa

Uuteen versioon riittää jatkossa vanhan `data`-kansion kopiointi. Ensimmäisellä käynnistyksellä pitää silti ajaa:

```bash
npm install
npm start
```

`npm install` ei muuta `data`-kansiota.


## V25 – pysyvä datahakemisto versionumeroiden ulkopuolella

V25 käyttää oletuksena yhteistä datahakemistoa:

macOS / Linux:

```text
~/.koodiopas/data
```

Windows:

```text
%USERPROFILE%\.koodiopas\data
```

Tämän ansiosta v25:n jälkeen uudet Koodiopas-versiot voivat käyttää samoja ryhmiä, opiskelijoita, kursseja, tehtäviä, palautuksia, rubriikkeja ja asetuksia ilman `data`-kansion käsin kopiointia.

### Siirtyminen v24 -> v25

Voit tehdä kuten tähänkin asti: kopioi v24:n `data`-kansio v25:n sisään ennen ensimmäistä käynnistystä.

V25 huomaa ensimmäisellä käynnistyksellä, että yhteinen `~/.koodiopas/data` on tyhjä, ja kopioi merkitykselliset vanhat tiedot sinne automaattisesti.

Sen jälkeen v26, v27 jne. voivat käyttää samaa pysyvää dataa automaattisesti.

### Oma datahakemisto

Halutessasi voit määrittää `.env`-tiedostossa:

```env
KOODIOPAS_DATA_DIR=/haluamasi/polku/koodiopas-data
```

Jos jätät sen tyhjäksi, käytetään `~/.koodiopas/data`-hakemistoa.

Dashboard näyttää käytössä olevan datahakemiston.

### Käynnistys

Uuden ohjelmaversion ensimmäisellä käyttökerralla tarvitaan edelleen:

```bash
npm install
npm start
```

`node_modules` kuuluu ohjelmaversioon, mutta käyttäjädata ei enää kuulu.


## V26 – kurssin vienti ja tuonti

Opettaja voi nyt viedä yhden kurssin JSON-paketiksi. Pakettiin sisältyvät:
- kurssin nimi
- kaikki tehtävät
- tehtävien asetukset
- tehtäväkohtaiset rubriikit

Pakettiin ei sisälly opiskelijoita, ryhmiä, palautuksia tai arviointihistoriaa.

Tuodessa Koodiopas luo kurssille ja tehtäville uudet tunnisteet, joten paketti voidaan tuoda turvallisesti myös samaan asennukseen ilman ID-törmäyksiä.

Tuotu kurssi ei kuulu automaattisesti mihinkään ryhmään. Opettaja liittää ryhmät kurssiin normaalisti Kurssit ja tehtävät -näkymässä.


## V27 – koko järjestelmän varmuuskopiointi

Opettajan uusi **Varmuuskopiointi**-näkymä mahdollistaa koko pysyvän datan viennin yhdeksi JSON-tiedostoksi.

Varmuuskopioon sisältyvät:
- ryhmät ja opiskelijat
- kurssit ja tehtävät
- GitHub-jakohistoria
- analytiikka
- palautukset ja arvioinnit
- rubriikit
- Koodioppaan asetukset

Palautuksessa Koodiopas näyttää ensin varmuuskopion sisällön yhteenvedon. Varsinainen palautus vaatii erillisen vahvistuksen.

Ennen nykyisen datan korvaamista Koodiopas tekee automaattisesti turvavarmuuskopion pysyvän datahakemiston `backups`-kansioon.


## V28 – määräajat ja myöhästymisten seuranta

Opettaja voi määrittää jokaiselle tehtävälle palautuksen päivämäärän ja kellonajan.

Opiskelija näkee:
- määräajan
- jäljellä olevan ajan
- ilmoituksen, jos määräaika on mennyt
- oman edistymisnäkymän myöhästymistiedot

Opettaja näkee:
- Dashboardin myöhässä olevien tehtävien määrän
- opiskelijakohtaiset myöhässä olevat palauttamattomat tehtävät
- arviointijonossa, jos palautus tehtiin määräajan jälkeen

Vanhoille tehtäville `dueAt` täydennetään automaattisesti tyhjäksi v24+:n datamigraation avulla.


### V28.1 korjaus
Määräaikakenttä lisättiin oikeaan dynaamisesti luotavaan tehtäväkorttiin.

## V29 – yksi repository per opiskelija per kurssi

Repositorymalli on muutettu skaalautuvaksi:
- yksi GitHub-repository / opiskelija / kurssi
- tehtävät omissa kansioissaan
- repositoryn template, prefix ja yksityisyys määritellään kurssitasolla
- tehtävällä on kansio, julkaisutila, määräaika ja Koodioppaan avustustaso
- vanhat tehtävät saavat migraatiossa automaattisen kansiopolun

Esimerkkirakenne:
```
html-2026-opiskelija/
  tehtava-01-html-perusteet/
  tehtava-02-otsikot/
  tehtava-03-linkit/
```

V29 sisältää uuden repository-plan API:n. Se muodostaa opiskelijakohtaisen kurssirepon nimen ja tehtävähakemistot. Seuraava vaihe on kytkeä varsinainen GitHub-jakotoiminto tähän malliin kokonaan.


### V29.1 korjaus

Korjattu `Tallenna kurssit` -toiminto. V29:n käyttöliittymästä poistettiin tehtäväkohtainen `Yksityinen repository` -kenttä, mutta tallennuskoodi yritti edelleen lukea poistettua `.aPrivate`-kenttää. Tämä aiheutti JavaScript-virheen ennen API-kutsua.

V29.1 poistaa vanhan viittauksen ja näyttää jatkossa käyttöliittymässä myös mahdollisen tallennusvirheen sen sijaan, että painike näyttäisi tekevän ei mitään.


### V29.2 – GitHub-jako muutettu kurssirepositorymalliin

Korjattu v29:n arkkitehtuurimuutos loppuun GitHub-jaon osalta.

Nyt:
- Template repository määritellään kurssille.
- Jokaiselle opiskelijalle luodaan vain yksi repository per kurssi.
- Ensimmäisessä tehtäväjulkaisussa kurssirepo luodaan kurssin templatesta.
- Jos kurssirepo on jo olemassa, Koodiopas lisää vain puuttuvan tehtäväkansion.
- Olemassa olevia opiskelijan tiedostoja ei ylikirjoiteta.
- Opiskelijan työtila osoittaa samaan kurssirepositoryyn, mutta näyttää valitun tehtävän kansion.


### V29.3 – vanhan template-datan migraatio

Jos vanhassa kurssissa `templateRepoUrl` on edelleen yksittäisellä tehtävällä mutta kurssitasolla tyhjä, Koodiopas siirtää ensimmäisen löytyvän template-osoitteen automaattisesti kurssille.

Tämä korjaa v29.2:ssa näkyneen virheen:
`Kurssilta puuttuu Template repository`

Jos kurssilla ei ole missään vanhassa tehtävässä template-osoitetta, opettajan pitää edelleen määrittää se Kurssit ja tehtävät -> Kurssin repository -osiossa.


### V29.4 – puuttuvan kurssitemplaten korjaus suoraan jaossa

Jos vanhasta datasta ei löydy enää tehtäväkohtaista template-repositorya eikä kurssilla ole templatea, Tehtävien jako -näkymä ei enää pysähdy pelkkään virheilmoitukseen.

Koodiopas näyttää kentän, johon opettaja antaa kurssin template-repositoryn GitHub-osoitteen. Osoite tallennetaan pysyvästi kurssille. Tämän jälkeen tehtävän jako voidaan jatkaa normaalisti.


### V29.5 – kurssirepo ja tehtäväjulkaisu korjattu

Kurssin Template repository on nyt vapaaehtoinen.

Uusi toimintamalli:
1. Jos opiskelijan kurssirepo puuttuu, Koodiopas luo sen.
2. Jos kurssille on määritetty oikea GitHub Template repository, sitä käytetään yhteisten tiedostojen pohjana.
3. Jos templatea ei ole, luodaan tavallinen alustettu repository.
4. Valittu tehtäväkansio lisätään aina erikseen.
5. Jos sama tehtäväkansio löytyy kurssin template-reposta, sen tiedostot kopioidaan.
6. Jos sitä ei löydy, Koodiopas luo tehtäväkansion itse ja lisää sinne README.md:n tehtävänannosta.
7. Olemassa olevia opiskelijan tehtävätiedostoja ei ylikirjoiteta.

Tämä mahdollistaa sekä uusien tehtävien jakamisen vanhoille opiskelijoille että uusien kurssirepositoryjen luomisen uusille opiskelijoille ilman, että template-repositorya täytyy ylläpitää jokaisen uuden tehtävän yhteydessä.


### V29.6 – template ei voi enää estää tehtävän jakoa

Kurssirepository luodaan nyt aina tavallisena uutena GitHub-repositoryna. Kurssin Template repositorya ei käytetä enää koko opiskelijarepositoryn generoimiseen.

Template toimii vain valinnaisena tehtävätiedostojen lähteenä:
- jos valitun tehtävän kansio löytyy templatesta, sen tiedostot kopioidaan
- jos kansiota ei löydy, toiminto ei anna virhettä
- Koodiopas luo tehtäväkansion itse ja lisää README.md:n tehtävänannosta
- opiskelijan olemassa olevia tiedostoja ei ylikirjoiteta

Tämä estää myös sen, etteivät julkaisemattomat tehtäväkansiot siirry opiskelijalle kurssirepon ensimmäisen luonnin yhteydessä.


### V29.7 – GitHub-jaon jälkitarkistus

Koodiopas ei enää merkitse tehtävää onnistuneesti julkaistuksi pelkän API-operaation perusteella.

Jokaisen opiskelijan kohdalla tarkistetaan GitHubista erikseen:
1. löytyykö kurssirepository oikeasti
2. löytyykö valitun tehtävän kansio oikeasti
3. syntyikö collaborator-kutsu
4. onko opiskelijan käyttöoikeus jo aktiivinen vai kutsu vielä odottamassa

Vihreä onnistumistila näytetään vasta repositoryn ja tehtäväkansion jälkitarkistuksen jälkeen.

Jos repo puuttuu, `Avaa`-linkkiä ei näytetä toimivana onnistumislinkkinä.
