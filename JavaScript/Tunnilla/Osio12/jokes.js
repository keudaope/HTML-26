async function vitsi() {
  const paikka = document.querySelector("#vitsi");
  const url = "https://dad-jokes.p.rapidapi.com/random/joke";
  const optiot = {
    method: "GET",
    headers: {
      "x-rapidapi-host": "dad-jokes.p.rapidapi.com",
      "x-rapidapi-key": "527371f994msh57563f768dd80f6p135d33jsn69c07817117b",
    },
  };
  try {
    const response = await fetch(url, optiot);
    const data = await response.json();
    const yksi = data.body;
    console.log(yksi);
    paikka.innerHTML = yksi[0].setup + "<br />" + yksi[0].punchline;
  } catch (error) {
    console.error(error);
  }
}
vitsi();
