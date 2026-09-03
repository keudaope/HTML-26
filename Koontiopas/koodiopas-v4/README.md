# Koodiopas v4

Uutta:
- malli on valmiiksi määritelty (`gpt-5.6`)
- opiskelijan ei tarvitse valita mallia
- neljä vihjetasoa: pieni vihje → tarkempi vihje → rinnakkainen esimerkki → malliratkaisu
- yrityshistoria säilyy selainistunnossa
- GitHub-tiedostot haetaan uudelleen jokaisella yrityksellä, joten commit + push näkyy seuraavassa tarkistuksessa
- API-kutsussa käytetään `store: false`
- Koodiopas ei kirjoita GitHubiin

## Käynnistys

```bash
npm install
npm start
```

Avaa `http://localhost:3000`.

Ilman API-avainta voit testata GitHub-repon ja tehtävien tunnistusta. Tekoälyanalyysi aktivoidaan myöhemmin lisäämällä `.env`-tiedostoon `OPENAI_API_KEY`.
