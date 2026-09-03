# Koodiopas v15

V15 säilyttää v14:n toimivan hallinnan ja tehtävien jaon sekä lisää opiskelijan varsinaisen työskentelyn.

## Opettajan näkymä

Mukana ovat edelleen:

1. Ryhmät
2. Kurssit ja tehtävät
3. GitHub-asetukset
4. Tehtävien jako

Uutena:

5. Jakohistoria
6. Opiskelijaseuranta

## Opiskelijan näkymä

Opiskelija kirjautuu GitHubilla. Häntä ei enää valita listasta.

Koodiopas yhdistää GitHub-käyttäjänimen:
- opiskelijaan
- ryhmään
- kurssiin
- tehtävään
- opiskelijan omaan repositoryyn

Opiskelija näkee vain omat tehtävänsä.

## Asteittainen ohjaus

Vihjetasot:

1. pieni vihje
2. tarkempi vihje
3. rinnakkainen esimerkki
4. malliratkaisu vain, jos opettaja on sallinut tason 4

Koodiopas lukee GitHub-repositoryn uusimman sisällön ennen analyysiä.

## OpenAI

Tekoälyvihjeet vaativat `.env`-tiedostoon:

```env
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6
```

Ilman avainta GitHub-kirjautuminen, opiskelijan työtila ja analytiikka toimivat demotilassa.

## OAuth-callbackit

V15 käyttää kahta polkua:

```text
http://127.0.0.1:3000/auth/github/teacher/callback
http://127.0.0.1:3000/auth/github/student/callback
```

Jos GitHub OAuth Appin yhden callback-kentän rajoitus aiheuttaa ongelman, seuraavassa versiossa kannattaa yhdistää nämä yhdeksi callbackiksi tai siirtyä GitHub Appiin.

## Päivitys v14:stä

V15-paketin `data`-kansio on tyhjä. Jos haluat säilyttää v14:n tiedot, kopioi vanhasta v14-kansiosta nämä tiedostot v15:n `data`-kansioon ennen käynnistystä:

```text
groups.json
courses.json
distributions.json
app-settings.json
```

`analytics.json` voi olla uusi.

## Käynnistys

```bash
npm install
npm start
```

Avaa:

```text
http://127.0.0.1:3000
```
