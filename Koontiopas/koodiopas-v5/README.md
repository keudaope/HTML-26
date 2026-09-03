# Koodiopas v5

Version 5 tärkein uusi ominaisuus on opettajan hallitsema avustustaso.

## Opettajan asetukset

Muokkaa tiedostoa `teacher-config.json`.

- `defaultMaxHintLevel`: 1–4
- `allowFullSolution`: saako malliratkaisun näyttää
- `minAttemptsBeforeFullSolution`: monennen yrityksen jälkeen malliratkaisu voidaan näyttää
- `teacherMessage`: opiskelijalle näkyvä opettajan viesti
- `projectRules`: tehtäväkohtaiset poikkeukset

Oletuksena Koodiopas pysähtyy tasolle 3 eikä näytä valmista ratkaisua.

## Käynnistys

```bash
npm install
npm start
```

Avaa `http://localhost:3000`.

Ilman API-avainta voit testata GitHub-haun, projektien tunnistuksen ja opettajan vihjerajoitukset.
