# Koodiopas v12 – GitHub-kirjautuminen opiskelijalle

Opiskelija ei enää valitse itseään listalta.

## GitHub OAuth App

Luo GitHubissa OAuth App ja käytä paikallisessa testissä:

Homepage URL:

`http://127.0.0.1:3000`

Authorization callback URL:

`http://127.0.0.1:3000/auth/github/callback`

Lisää `.env`-tiedostoon:

```env
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
BASE_URL=http://127.0.0.1:3000
TEACHER_PASSWORD=...
SESSION_SECRET=...
PORT=3000
```

## Testi

1. Käynnistä `npm install` ja `npm start`.
2. Kirjaudu opettajana.
3. Lisää Ryhmät-näkymässä oma GitHub-käyttäjänimesi opiskelijan kohdalle.
4. Palaa opiskelijan näkymään.
5. Paina **Kirjaudu GitHubilla**.
6. Koodiopas näyttää vain tunnukseesi liitetyt kurssit ja tehtävät.

OAuth-virrassa käytetään state-tarkistusta ja PKCE:tä. GitHub access tokenia ei tallenneta sessioon tai tiedostoihin; sitä käytetään vain `/user`-identiteetin hakemiseen.
