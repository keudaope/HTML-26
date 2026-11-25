const kayttajalle = document.getElementById("kayttajalle");
function loading(arvo)
{
    if(arvo === true)
    {
        kayttajalle.textContent = "Ladataan...";
    }
}
async function loadProducts()
{
    try
    {
        loading(true);
        const response = await fetch("/api/products");
        if(!response.ok) 
        {
            if(response.status === 404)
            {
                console.log("Tuotteita ei löytynyt!");
                kayttajalle.textContent = "Tuotteita ei löytynyt";0
            }
            if(response.status === 500)
            {
                console.log("Palvelimella tapahtui virhe (500)");
                kayttajalle.textContent = "Palvelimella tapahtui virhe (500)";
            }
        }
        const data = await response.json();
        render(data);
    }
    catch(error)
    {
        console.error("Tuli seuraava virhe: ", error);
    }
    finally
    {
        loading(false);    
    }
}

loadProducts();