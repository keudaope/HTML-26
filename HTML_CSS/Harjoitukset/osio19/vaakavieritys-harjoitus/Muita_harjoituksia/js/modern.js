const menuButton = document.querySelector(".menu-button");
const mainMenu = document.querySelector("#main-menu");
const menuLinks = mainMenu.querySelectorAll("a");
const year = document.querySelector("#year");

function closeMenu() {
  mainMenu.classList.remove("is-open");
  menuButton.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
}

menuButton.addEventListener("click", () => {
  const menuIsOpen = mainMenu.classList.toggle("is-open");

  menuButton.setAttribute("aria-expanded", String(menuIsOpen));
  document.body.classList.toggle("menu-open", menuIsOpen);
});

menuLinks.forEach((link) => {
  link.addEventListener("click", closeMenu);
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 850) {
    closeMenu();
  }
});

year.textContent = new Date().getFullYear();
