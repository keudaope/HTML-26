/*
ISÄVITSIT, toimii
*/
async function rapidApi() {
  const url = "https://dad-jokes.p.rapidapi.com/random/joke";
  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": "527371f994msh57563f768dd80f6p135d33jsn69c07817117b",
      "X-RapidAPI-Host": "dad-jokes.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    console.log(result);
    document.getElementById("kaannos").innerHTML =
      result.body[0].setup + "<br/>" + result.body[0].punchline;
  } catch (error) {
    console.error(error);
  }
}

/*
KAUPUNKITIETOJA - toimii
*/
async function referential() {
  const url = "https://wft-geo-db.p.rapidapi.com/v1/geo/adminDivisions";
  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": "527371f994msh57563f768dd80f6p135d33jsn69c07817117b",
      "X-RapidAPI-Host": "wft-geo-db.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    console.log(result);
    luku = Math.floor(Math.random() * 5);
    document.getElementById("tahan").innerHTML =
      "Nimi: " +
      result.data[luku].name +
      "<br/>" +
      "Maa: " +
      result.data[luku].country +
      "<br/>" +
      "Alue: " +
      result.data[luku].region +
      "<br/>";
  } catch (error) {
    console.error(error);
  }
}

/* 
SAATIEDOT - toimii
*/
async function saa() {
  paikkakunta = document.getElementById("kaupunki").value;
  const url =
    "https://weatherapi-com.p.rapidapi.com/current.json?q=" + paikkakunta;
  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": "527371f994msh57563f768dd80f6p135d33jsn69c07817117b",
      "X-RapidAPI-Host": "weatherapi-com.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    console.log(result);
    document.getElementById("saa").innerHTML =
      "Paikkakunta: " +
      result.location.name +
      ", " +
      result.location.country +
      " <br/>" +
      "Asteosoite: " +
      result.location.lat +
      " leveysastetta ja " +
      result.location.lon +
      " pituusastetta <br/>" +
      "LÃ¤mpÃ¶tila: " +
      result.current.temp_c +
      " astetta<br/>" +
      "Kosteus: " +
      result.current.humidity +
      "%<br/>" +
      "Tuulen nopeus " +
      result.current.wind_kph +
      " km/t";
  } catch (error) {
    console.error(error);
  }
}

/*
RAKKAUSLASKIN - ei toimi
*/
async function rakkaus() {
  mies = document.getElementById("mies").value;
  nainen = document.getElementById("nainen").value;
  const url =
    "https://love-compatibility-calculator-api-apiverve.p.rapidapi.com/v1/lovecalculator?name2=" +
    nainen +
    "&name1=" +
    mies;
  const options = {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-RapidAPI-Key": "527371f994msh57563f768dd80f6p135d33jsn69c07817117b",
      "X-RapidAPI-Host":
        "llove-compatibility-calculator-api-apiverve.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    console.log(result);
    document.getElementById("yhteensopivat").innerHTML =
      "HenkilÃ¶t " +
      result.fname +
      " ja " +
      result.sname +
      "<br/>" +
      "ovat " +
      result.percentage +
      " prosenttisesti yhteensopivia" +
      "<br/>" +
      result.result;
  } catch (error) {
    console.error(error);
  }
}

async function leffat() {
  alkuvuosi = document.getElementById("avuosi").value;
  loppuvuosi = document.getElementById("lvuosi").value;
  kieli = document.getElementById("kieli").value;
  type = document.getElementById("tyyppi").value;
  const url =
    "https://ott-details.p.rapidapi.com/advancedsearch?start_year=" +
    alkuvuosi +
    "&end_year=" +
    loppuvuosi +
    "&min_imdb=6&max_imdb=7.8&genre=action&language=" +
    kieli +
    "&type=" +
    type +
    "&sort=latest&page=1";
  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": "527371f994msh57563f768dd80f6p135d33jsn69c07817117b",
      "X-RapidAPI-Host": "ott-details.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    console.log(result.results);
    const leffa = result.results;
    for (var i = 0; i < leffa.length; i++) {
      document.getElementById("ltahan").innerHTML +=
        "----------<br/>Nimi: " +
        leffa[i].title +
        "<br/>" +
        "Tarina: " +
        leffa[i].synopsis +
        "<br/>----------";
    }
  } catch (error) {
    console.error(error);
  }
}
async function koirat() {
  const url = "https://dog-facts2.p.rapidapi.com/facts";
  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": "527371f994msh57563f768dd80f6p135d33jsn69c07817117b",
      "X-RapidAPI-Host": "dog-facts2.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    console.log(result.facts);
    document.getElementById("koirat").innerHTML = result.facts;
  } catch (error) {
    console.error(error);
  }

  // The URL of the Dog API
  const apiUrl = "https://dog.ceo/api/breeds/image/random";

  const response = await fetch(apiUrl);
  const result = await response.json();
  console.log(result);
  document.getElementById("koirakuva").innerHTML =
    "<img src=\'" + result.message + "\'>";
}

async function vienna() {
  teksti = document.getElementById("teksti").value;
  kieli = document.getElementById("language").value;
  console.log(kieli);
  const url = "https://translate281.p.rapidapi.com/";
  const options = {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "X-RapidAPI-Key": "527371f994msh57563f768dd80f6p135d33jsn69c07817117b",
      "X-RapidAPI-Host": "translate281.p.rapidapi.com",
    },
    body: new URLSearchParams({
      text: teksti,
      from: "auto",
      to: kieli,
    }),
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    console.log(result);
    document.getElementById("kaannosteksti").innerHTML = result.response;
  } catch (error) {
    console.error(error);
  }
}
async function chuck() {
  const url =
    "https://matchilling-chuck-norris-jokes-v1.p.rapidapi.com/jokes/random";
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      "X-RapidAPI-Key": "527371f994msh57563f768dd80f6p135d33jsn69c07817117b",
      "X-RapidAPI-Host": "matchilling-chuck-norris-jokes-v1.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    console.log(result);
    document.getElementById("chuck").innerHTML = result.value;
  } catch (error) {
    console.error(error);
  }
}

async function musa() {
  const artisti = document.getElementById("art").value;
  const url =
    "https://spotify23.p.rapidapi.com/search/?q=" +
    artisti +
    "&type=multi&offset=0&limit=10&numberOfTopResults=5";
  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": "527371f994msh57563f768dd80f6p135d33jsn69c07817117b",
      "X-RapidAPI-Host": "spotify23.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    osoite = result.playlists.items[0].data.uri;
    osoite = osoite.slice(osoite.indexOf(":") + 1);
    osoite = osoite.slice(osoite.indexOf(":") + 1);
    osoite = "https://open.spotify.com/playlist/" + osoite;
    var ikkuna = window.open(osoite, "_blank");
    ikkuna.focus();
    console.log(osoite);
  } catch (error) {
    console.error(error);
  }
}
