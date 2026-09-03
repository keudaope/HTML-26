# Koodiopas v8

Uutta tässä versiossa:
- opettajan koontinäkymä
- avunpyyntöjen määrä
- opiskelijamäärä tunnisteiden perusteella
- eniten apua vaativat tehtävät
- yleisimmät ongelmateemat
- vihjetasojen käyttö
- viimeisimmät avunpyynnöt
- analytiikka tallentuu paikallisesti `data/analytics.json`-tiedostoon

Demo toimii ilman API-avainta: kun opiskelija painaa **Pyydä vihje**, yritys tallentuu koontiin, vaikka tekoälyvastausta ei vielä tuoteta.

Käynnistys:
```bash
npm install
npm start
```

Avaa `http://localhost:3000`.
