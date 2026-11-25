class ShoppingCard
{
    constructor(){
        this.tuotteet = [];
        
    }
    addProduct(product, price)
    {
        let id = this.tuotteet.length + 1;
        console.log(id, this.tuotteet.length);
        this.tuotteet.push({id, product, price});
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
        return summa;
    }
    clear()
    {
        this.tuotteet = [];
    }
}

const ostoskori = new ShoppingCard();
ostoskori.addProduct("Hiiri", 29.95);
ostoskori.addProduct("Hiirimatto", 10.95);
ostoskori.addProduct("Näppäimistö", 39.95);
console.log(ostoskori.total);
console.table(ostoskori);
ostoskori.remove(1);
console.table(ostoskori);
