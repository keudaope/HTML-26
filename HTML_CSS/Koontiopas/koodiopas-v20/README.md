# Koodiopas v20

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
