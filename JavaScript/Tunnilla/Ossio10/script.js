const minus = document.querySelector('#minus');
const plus = document.querySelector('#plus');
const count = document.getElementById('count');
let maara = 0;

minus.addEventListener('click', vahenna);
plus.addEventListener('click', kasvata);

function vahenna()
{
    maara--;
    count.innerHTML = maara;
}
function kasvata()
{
    maara++;
    count.innerHTML = maara;
}