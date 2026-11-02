# Koodiopas v6

Version 6 tärkein uusi ominaisuus on opettajan oma selainkäyttöliittymä.

## Uutta

Sovelluksessa on nyt kaksi näkymää:

- Opiskelijan näkymä
- Opettajan asetukset

Opettaja voi selaimessa määrittää:

- opiskelijalle näytettävän viestin
- oletusmaksimivihjetason
- sallitaanko malliratkaisu
- kuinka monta yritystä tarvitaan ennen malliratkaisua
- tehtäväkohtaisia sääntöjä

Asetukset tallennetaan automaattisesti tiedostoon:

```text
teacher-config.json
```

## Käynnistys

```bash
npm install
npm start
```

Avaa:

```text
http://localhost:3000
```

## Testaus ilman API-avainta

Voit testata jo nyt:

- repositoryn haun
- projektien tunnistuksen
- opettajan asetusten muokkauksen selaimessa
- asetusten tallentumisen
- tehtäväkohtaisten vihjerajojen näkymisen opiskelijalle

Tekoälyanalyysi kytketään myöhemmin API-avaimella.
