function store(event) {
  event.preventDefault();

  const brand = document.getElementById("carBrand").value.trim();
  const model = document.getElementById("carModel").value.trim();
  const price = Number(document.getElementById("carPrice").value);
  const key = document.getElementById("key").value.trim();

  if (!key || !brand || !model || !Number.isFinite(price) || price < 0) {
    alert("Tarkista auton tiedot ja tallennusavain.");
    return;
  }

  // Haetaan olemassa olevat autot
  let autot;

  try {
    autot = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(autot)) {
      autot = [];
    }
  } catch (error) {
    console.error("Tallennettujen autojen luku epäonnistui:", error);
    alert("Tallennettu tieto ei ole kelvollista JSON-muotoa.");
    return;
  }

  const car = {
    merkki: brand,
    malli: model,
    hinta: price,
  };

  // Lisätään uusi auto
  autot.push(car);

  // Tallennetaan päivitetty taulukko
  localStorage.setItem(key, JSON.stringify(autot));

  console.log("Auto tallennettu:", car);
}

function retrieveRecords() {
  const key = document.getElementById("retrieveKey").value.trim();
  const element = document.getElementById("retrieve");

  element.replaceChildren();

  const saved = localStorage.getItem(key);

  if (saved === null) {
    element.textContent = "Avaimella ei löytynyt autoja.";
    return;
  }

  let autot;

  try {
    autot = JSON.parse(saved);
  } catch (error) {
    element.textContent = "Tallennettu tieto ei ole kelvollista JSON-muotoa.";
    return;
  }

  if (!Array.isArray(autot)) {
    element.textContent = "Tallennettu tieto ei ole autotaulukko.";
    return;
  }

  if (autot.length === 0) {
    element.textContent = "Ei tallennettuja autoja.";
    return;
  }

  autot.forEach((car) => {
    const paragraph = document.createElement("p");

    paragraph.textContent = `${car.merkki} ${car.malli} – ${car.hinta} €`;

    element.appendChild(paragraph);
  });
}

function removeItem() {
  const key = document.getElementById("removeKey").value.trim();

  localStorage.removeItem(key);
  console.log("Avain poistettu:", key);
}

function clearStorage() {
  localStorage.clear();
  console.log("Kaikki localStorage-tiedot poistettu");
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("carForm").addEventListener("submit", store);

  document
    .getElementById("clearButton")
    .addEventListener("click", clearStorage);

  document.getElementById("removeButton").addEventListener("click", removeItem);

  document
    .getElementById("retrieveButton")
    .addEventListener("click", retrieveRecords);
});
