class ShoppingCard
{
    constructor(alennus){
        this.tuotteet = [];
        this.laskuri = 0;
        this.alennus = alennus;
    }
    addProduct(product, price)
    {
        const id = this.laskuri;
        this.tuotteet.push({id, product, price});
        this.laskuri++;
    }
    remove(id)
    {
        this.tuotteet = this.tuotteet.filter(s => s.id !== id);
    }
    get total()
    {
        let summa = 0;
        for(const tuote of this.tuotteet)
        {
            summa += tuote.price;
        }
        return summa * (1 - this.alennus);
    }
    clear()
    {
        this.tuotteet = [];
    }
    get naytaTuotteet()
    {
        for(const tuote of this.tuotteet)
        {
            console.log(tuote.id,tuote.product, tuote.price);
        }
    }
}
let alennus10 = 0.1;
let alennus20 = 0.2;
let alennus30 = 0.3;
const ostoskori = new ShoppingCard(alennus30);
ostoskori.addProduct("Hiiri", 29.95);
ostoskori.addProduct("Hiirimatto", 10.95);
ostoskori.addProduct("Näppäimistö", 39.95);
ostoskori.naytaTuotteet;
console.log("Ostoskorin kokonaisarvo, kun alennus on", alennus30 * 100 + "%", ":", Math.round(ostoskori.total * 100) / 100,"€");
console.log("Alkuperäinen hinta:", Math.round(ostoskori.total / (1 - alennus30) * 100) / 100,"€");
console.log("-------------------------");
console.log("Poistetaan tuote id:llä 1");
ostoskori.remove(1);
ostoskori.naytaTuotteet;
console.log("Lisätään ostoskoriin uusi tuote");
ostoskori.addProduct("Webkamera", 49.95);
ostoskori.naytaTuotteet;
console.log("Ostoskorin kokonaisarvo, kun alennus on", alennus30 * 100 + "%", ":", Math.round(ostoskori.total * 100) / 100,"€");
console.log("Alkuperäinen hinta:", Math.round(ostoskori.total / (1 - alennus30) * 100) / 100,"€");
console.log("-------------------------");
console.log("Tyhjennetään ostoskori");
ostoskori.clear();
ostoskori.naytaTuotteet;
console.log("-------------------------");

