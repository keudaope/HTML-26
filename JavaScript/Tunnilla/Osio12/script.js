// function greet(){
//     console.log("Hei, tervetuloa tunnille!");
// }
// console.log('A');
// greet();    
// console.log('B');

// console.log("1");

// setTimeout(() => {
//   console.log("2");
// }, 0);

// console.log("3");

async function loadUsers() {
  const haku = fetch("https://randomuser.me/api/");
  haku
  .then((response) => response.json())
  .then((data) => {
    const user = data.results[0];
    console.log(user);
  });
}
loadUsers();
