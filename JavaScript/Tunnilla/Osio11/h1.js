
const url = "https://randomuser.me/api/?results=50";

async function fetchData(url) {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        const cleanUsers = data.results.map(user => ({
            fullName: `${user.name.first} ${user.name.last}`,
            email: user.email,
            city: user.location.city
        }));

        return cleanUsers;

    } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
    }
}

// Haetaan tiedot ja tulostetaan ne
async function main() {
    const tiedot = await fetchData(url);
    etsiNimi(tiedot);
}

function displayUsers(users) {
    const userContainer = document.getElementById('user-list');
    userContainer.innerHTML = ''; // Tyhjennetään vanhat käyttäjät
    for (const user of users) {
        const userCard = document.createElement('div');
        userCard.classList.add('user-card');
        const userName = document.createElement('h3');
        userName.textContent = user.fullName;
        const userEmail = document.createElement('p');
        userEmail.textContent = `Email: ${user.email}`;
        const userCity = document.createElement('p');
        userCity.textContent = `City: ${user.city}`;
        userCard.append(userName, userEmail, userCity);
        userContainer.append(userCard);
    }  
}

function etsiNimi(users){
    const etsiNimi = document.getElementById('search');
    etsiNimi.addEventListener('input', () => {
        const searchTerm = etsiNimi.value.toLowerCase();
        const filteredUsers = users.filter(user => user.fullName.toLowerCase().includes(searchTerm));
        displayUsers(filteredUsers);
    });
}
main();
