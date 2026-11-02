// 1. Change color of car and addToCart button color when a color is selected
// - Selecting Elements
const redColor = document.querySelector(".red");
const grayColor = document.getElementsByClassName("gray");
const blackColor = document.querySelector(".black");
const cartButton = document.getElementById("button");
const itemTag = document.getElementsByTagName("h3")[0];
const imageCard = document.querySelector(".product-image img");
const feedbackBtn = document.querySelector(".feedback");
const mileage = document.querySelector(".mileage");
const new_price = document.querySelector(".new-price");
const old_price = document.querySelector(".old-price");

setStars(3);

// Modifying Elements
// - Add Event Listeners
// - Red Color
redColor.addEventListener("click", function () {
  cartButton.style.backgroundColor = "red";
  itemTag.style.backgroundColor = "red";
  imageCard.src = "img/c300_red.jpg";
  mileage.innerHTML = "6,600 miles";
  new_price.innerHTML = "$130,500";
  setStars(4);
});

// - Gray Color
grayColor[0].addEventListener("click", function () {
  cartButton.style.backgroundColor = "gray";
  itemTag.style.backgroundColor = "gray";
  imageCard.src = "img/c300.jpeg";
    mileage.innerHTML = "4,000 miles";
    new_price.innerHTML = "$142,500";
  setStars(3);
});

// - Black Color
blackColor.addEventListener("click", function () {
  cartButton.style.backgroundColor = "black";
  itemTag.style.backgroundColor = "black";
  imageCard.src = "img/c300_black.jpeg";
  mileage.innerHTML = "98,000 miles";
  new_price.innerHTML = "$72,990";
  setStars(5);
});

// Button Click Implementation
// - Cart Button
const cart = () => {
  cartButton.style.display = "none";
  feedbackBtn.style.display = "block";
};
cartButton.addEventListener("click", cart);

// - Feedback Button
const feedback = () => {
  cartButton.style.display = "block";
  feedbackBtn.style.display = "none";
};
feedbackBtn.addEventListener("click", feedback);

function setStars(rating) {
  const stars = document.querySelector(".stars");

  stars.innerHTML = "";

  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("i");

    star.classList.add("fa-solid", "fa-star");

    if (i <= rating) {
      star.style.color = "yellow";
    } else {
      star.style.color = "gray";
    }

    stars.appendChild(star);
  }
}
