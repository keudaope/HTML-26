const STORAGE_KEY = "ostoskorinTuotteet";

// localStorage: lue tallennetut tuotteet
function lataaTuotteet() {
  try {
    const tallennetut = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    return Array.isArray(tallennetut) ? tallennetut : [];
  } catch (virhe) {
    console.error("Tallennettuja tuotteita ei voitu lukea:", virhe);

    return [];
  }
}

// localStorage: tallenna tuotteet
function tallennaTuotteet(tuotteet) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tuotteet));
}

export { lataaTuotteet, tallennaTuotteet };
