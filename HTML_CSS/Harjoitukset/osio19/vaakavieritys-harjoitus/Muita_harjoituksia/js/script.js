const profileForm = document.querySelector("#profile-form");
const fullNameInput = document.querySelector("#full-name");
const sidebarName = document.querySelector("#sidebar-name");
const formMessage = document.querySelector("#form-message");

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!profileForm.checkValidity()) {
    profileForm.reportValidity();
    return;
  }

  sidebarName.textContent = fullNameInput.value.trim();
  formMessage.textContent = "Muutokset tallennettiin onnistuneesti.";

  window.setTimeout(() => {
    formMessage.textContent = "";
  }, 3500);
});
