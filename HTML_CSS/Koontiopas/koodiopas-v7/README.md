# Koodiopas v7

Version 7 tärkein uusi ominaisuus on suojattu opettajan näkymä.

## Uutta

- opettajan asetukset vaativat kirjautumisen
- salasana määritellään `.env`-tiedostossa
- asetusten API on suojattu palvelimella
- opiskelija ei voi lukea tai muuttaa koko opettajan asetustiedostoa
- opiskelijalle näytetään vain opettajan yleinen viesti
- kirjautuminen säilyy selainistunnossa enintään 8 tuntia

## Asennus

```bash
npm install
```

Kopioi:

```text
.env.example
```

nimelle:

```text
.env
```

Lisää esimerkiksi:

```env
TEACHER_PASSWORD=oma-vahva-salasana
SESSION_SECRET=jokin-pitka-satunnainen-merkkijono
PORT=3000
```

API-avainta ei tarvitse vielä lisätä.

Käynnistä:

```bash
npm start
```

Avaa:

```text
http://localhost:3000
```

## Opettajan kirjautuminen

Valitse yläreunasta:

```text
Opettajan näkymä
```

ja syötä `.env`-tiedostossa oleva `TEACHER_PASSWORD`.

## Tietoturvahuomio

Tämä kirjautuminen on riittävä paikalliseen prototyyppiin, mutta ei vielä tuotantopalveluun.
Ennen opiskelijoille verkkoon julkaisemista kannattaa lisätä HTTPS, oikea käyttäjähallinta,
salasanan hash-tallennus ja pysyvä sessionhallinta.
