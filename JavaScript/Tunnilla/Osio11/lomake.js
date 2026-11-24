const form = document.querySelector("form");

const password1 = document.querySelector("#password");
const password2 = document.querySelector("#confirmPassword");
const vahvuus = document.querySelector("#vahvuus");

// Tarkistaa, ovatko salasanat samat
function validatePassword() {
  const match = password1.value === password2.value;

  password2.setCustomValidity(match ? "" : "Salasanat eivät täsmää!");
}

// Laskee salasanan vahvuuspisteet
function checkPasswordStrength() {
  const value = password1.value;

  const score = [
    value.length >= 10,
    /[A-Z]/.test(value),
    /[0-9]/.test(value),
  ].filter(Boolean).length;

  console.log("Salasanan pisteet:", score);

  if (value.length === 0) {
    vahvuus.textContent = "";
  } else if (score < 3) {
    vahvuus.textContent = "Salasanasi on heikko";
  } else {
    vahvuus.textContent = "Salasanasi täyttää kaikki kolme ehtoa";
  }
}

// Tapahtumankuuntelijat rekisteröidään vain kerran
password1.addEventListener("input", () => {
  validatePassword();
  checkPasswordStrength();
});

password2.addEventListener("input", validatePassword);

// Tarkistetaan myös valmiiksi asetetut arvot
validatePassword();
checkPasswordStrength();

// Lomakkeen lähetys
form.addEventListener("submit", (event) => {
  event.preventDefault();

  validatePassword();

  if (!form.reportValidity()) {
    return;
  }

  const formData = new FormData(form);

  console.log("Lomake on kelvollinen!");
});
