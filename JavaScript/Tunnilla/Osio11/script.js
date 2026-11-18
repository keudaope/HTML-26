const apiUrl = 'https://randomuser.me/api/?results=50&gender=female&nat=fi';
const userContainer = document.getElementById('cards');
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

fetchData(apiUrl)
.then(data => {
    for (const user of data.results) {
        displayUser(user);
    }
})
.catch(error => {
    console.error('Error:', error);
});

function displayUser(user) {
    const userCard = document.createElement('div');
    userCard.classList.add('user-card');
    const userPicture = document.createElement('img');
    userPicture.src = user.picture.large;
    userPicture.alt = 'User Picture';
    const userName = document.createElement('h3');
    userName.textContent = `${user.name.first} ${user.name.last}`;
    const userGender = document.createElement('p');
    userGender.textContent = `Gender: ${user.gender}`;
    const userNationality = document.createElement('p');
    userNationality.textContent = `Nationality: ${user.nat}`;
    const userEmail = document.createElement('p');
    userEmail.textContent = `Email: ${user.email}`;
    userCard.append(userPicture, userName, userGender, userNationality, userEmail);

    // userCard.innerHTML = `
    //     <img src="${user.picture.medium}" alt="User Picture">
    //     <h3>${user.name.first} ${user.name.last}</h3>
    //     <p>Gender: ${user.gender}</p>
    //     <p>Nationality: ${user.nat}</p>
    //     <p>Email: ${user.email}</p>
    // `;

    userContainer.appendChild(userCard);    
}
