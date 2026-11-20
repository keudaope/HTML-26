async function saa(event) {
  event.preventDefault();
  const paikkakunta = document.getElementById("kaupunki").value;
  const url =
    "https://weatherapi-com.p.rapidapi.com/current.json?q=" + paikkakunta + "";
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
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
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
      "L&auml;mp&ouml;tila: " +
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
laheta = document.querySelector("form");
laheta.addEventListener("submit", saa);
