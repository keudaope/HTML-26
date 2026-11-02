// Dia 1
// for (let i = 1; i <= 5; i++) {
//   console.log(`Kierros ${i}`);
// }
// for (let i = 1; i <= 10; i++) {
//   if (i % 2 === 0) {
//     continue;
//   }
//   console.log(i); // vain parittomat
// }

// let luku = 7;
// for(let i = 1; i <=10; i++)
// {
//     console.log(`${luku} * ${i} = ${luku*i}`);
// }

// const pisteet = [8, 7, 10, 6, 9];
// let summa = 0;
// for(const piste of pisteet)
// {
//     summa += piste;
// }
// console.log(`Summa: ${summa}, keskiarvo: ${summa / pisteet.length}`);

for (let i = 1; i <= 30; i++) {
  if (i % 5 === 0 && i % 3 === 0) {
    console.log("FizzBuzz");
  } else if (i % 5 === 0) {
    console.log("Buzz");
  } else if (i % 3 === 0) {
    console.log("Fizz");
  } else {
    console.log(i);
  }
}
