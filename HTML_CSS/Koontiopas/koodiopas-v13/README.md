# Koodiopas v13

Uutta:
- opettajan GitHub OAuth -yhteys
- `repo read:org` -oikeudet
- tehtävän jakamisen esikatselu
- repositoryjen luonti GitHub Template repositorysta
- repositoryt luodaan `GITHUB_ORG`-organisaatioon
- opiskelija lisätään collaboratoriksi `push`-oikeudella
- jo olemassa olevia repositoryja ei luoda uudelleen
- jakotulos tallentuu `data/distributions.json`-tiedostoon

`.env` tarvitsee:

```env
TEACHER_PASSWORD=...
SESSION_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
BASE_URL=http://127.0.0.1:3000
GITHUB_ORG=organisaation-nimi
DEFAULT_REPO_PRIVATE=true
PORT=3000
```

OAuth Appin callback:

```text
http://127.0.0.1:3000/auth/github/teacher/callback
```

Tehtävän `templateRepoUrl`-repository pitää merkitä GitHubissa Template repositoryksi.
