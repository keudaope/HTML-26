// async function load() {
//   const loader = document.querySelector("#loader");
//   loader.hidden = false;

//   try {
//     const haku = await fetch("https://randomuser.me/api/");
//     const data = await haku.json();
//     const user = data.results[0];
//     renderUsers(data.results);
//     await new Promise((resolve) => setTimeout(resolve, 2000));
//     // console.log(user);
//   } catch (error) {
//     console.error("Error fetching user data:", error);
//   } finally {
//     loader.hidden = true;
//   }
// }

// load();

// const list = document.querySelector("#userlist");
// function renderUsers(users) {
//   list.replaceChildren();
//   for (const user of users) {
//     const li = document.createElement("li");
//     li.textContent = user.name.first + " " + user.name.last;
//     list.append(li);
//   }
// }

async function haeKayttajat() {
  const response = await fetch("https://dummyjson.com/users");

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const users = data.users;
  console.log(users);

  lisaaKayttajaListaan(users);
}
function lisaaKayttajaListaan(users) {
  const kaikki = document.querySelector("#kaikki");
  const lista = document.createElement("ul");
  for (const user of users) {
    const kayttaja = document.createElement("li");
    kayttaja.innerHTML =
      user.firstName + " " + user.lastName + "<br /> " + user.email;
    lista.append(kayttaja);
  }
  kaikki.append(lista);
}
haeKayttajat();
