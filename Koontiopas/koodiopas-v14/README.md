# Koodiopas v14

V14 korjaa v13:n hallintapuolen puutteen.

Opettajan näkymässä on nyt neljä vaihetta:

1. Ryhmät
2. Kurssit ja tehtävät
3. GitHub-asetukset
4. Tehtävien jako

## 1. Ryhmät

Lisää ryhmä ja opiskelijat:

- tunniste
- nimi
- GitHub-käyttäjänimi

## 2. Kurssit ja tehtävät

Luo kurssi, liitä siihen ryhmät ja lisää tehtävät.

Tehtävässä määritetään:

- tehtävän nimi
- Template repository
- repository-prefix
- Koodioppaan avustustaso 1–4
- tehtävänanto
- julkinen/yksityinen repository

## 3. GitHub-asetukset

GitHub-organisaatio määritetään nyt selaimessa.

Esimerkki:

```text
keuda-ohjelmistokehitys
```

Älä kirjoita koko URL:ia.

OAuth-salaisuudet pysyvät edelleen `.env`-tiedostossa:

```env
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
BASE_URL=http://127.0.0.1:3000
```

Callback:

```text
http://127.0.0.1:3000/auth/github/teacher/callback
```

## 4. Tehtävien jako

Valitse:

- kurssi
- tehtävä
- ryhmä

Paina ensin **Esikatsele jako**.

Vasta tämän jälkeen **Jaa tehtävä ryhmälle** luo repositoryt GitHubiin.

## Käynnistys

```bash
npm install
npm start
```

Avaa:

```text
http://127.0.0.1:3000
```
