const input = document.querySelector('#name');
const preview = document.querySelector('#preview');

input.addEventListener('input', (event) => {
  preview.textContent = event.target.value;
});
