# Koodiopas v10

Version 10 lisää CSV-tuonnin ryhmiin ja dashboardin CSV-viennin.

## CSV-tuonti

Opettajan näkymässä kohdassa **Ryhmät** voit tuoda opiskelijat CSV-tiedostosta.

Suositeltu muoto:

```csv
ryhma;opiskelija;tunniste;github
Ohjelmistokehittäjä 2026;Matti Meikäläinen;matti01;https://github.com/kayttaja/repo
Ohjelmistokehittäjä 2026;Maija Mallikas;maija02;https://github.com/kayttaja/repo2
```

Myös pilkkueroteltu CSV hyväksytään. Uusi ryhmä luodaan automaattisesti. Jos tunniste löytyy jo, opiskelijan tiedot päivitetään. CSV-tuonnin jälkeen paina **Tallenna ryhmät**.

Ryhmät-näkymässä on myös **Lataa esimerkkipohja** -painike.

## CSV-vienti

Koontinäkymän **Vie CSV** vie nykyisten suodattimien mukaiset analytiikkatapahtumat. Tiedosto on UTF-8 BOM -muodossa ja puolipiste-eroteltu, jotta se avautuu yleensä hyvin suomalaisessa Excelissä.

Sarakkeet: aika, ryhmä, opiskelija, tunniste, tehtävä, vihjetaso ja teema.

## Käynnistys

```bash
npm install
npm start
```

Avaa `http://localhost:3000`.
