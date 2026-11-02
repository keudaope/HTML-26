let kirjautunut = false;
let admin = true;
let opettaja = false;

if(kirjautunut && (admin || opettaja))
{
    console.log("Saa muokata")
}
else if(!kirjautunut)
{
    console.log("kirjaudu sisään")
}
else{
    console.log("lukuoikeus");
}