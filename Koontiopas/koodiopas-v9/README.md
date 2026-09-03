# Koodiopas v9

Version 9 lisää kurssi- ja ryhmärakenteen.

## Uutta

Opettaja voi nyt luoda ryhmiä ja lisätä niihin opiskelijoita sekä heidän GitHub-repositoryjensa osoitteet.

Opiskelijan näkymässä:
- valitaan ryhmä
- valitaan opiskelija
- repository täyttyy automaattisesti
- avunpyyntö tallentuu oikean ryhmän ja opiskelijan alle

Opettajan koontinäkymässä voi suodattaa:
- ryhmän mukaan
- opiskelijan mukaan
- tehtävän mukaan
- aloituspäivän mukaan
- lopetuspäivän mukaan

## Ryhmätiedosto

Ryhmät tallentuvat:

```text
data/groups.json
```

## Analytiikka

Analytiikka tallentuu:

```text
data/analytics.json
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

## Tärkeä huomio

Tämä on edelleen paikallinen prototyyppi. Opiskelijan tunnisteet ja nimet tallentuvat paikalliseen JSON-tiedostoon. Älä käytä arkaluonteisia henkilötietoja.

## Seuraava vaihe

Seuraavaksi voidaan lisätä:
- CSV-tuonti opiskelijoille
- CSV-vienti dashboardista
- GitHub Classroom -integraatio
- oikea opiskelijakirjautuminen
- kurssikohtaiset tehtäväpaketit
