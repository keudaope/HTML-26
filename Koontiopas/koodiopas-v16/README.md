# Koodiopas v16

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
