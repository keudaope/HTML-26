class Henkilo {
  constructor(nimi, sposti, palkka, akti) 
{ 
  this.nimi = nimi;
  this.email = sposti;
  this.kkpalkka = palkka;
  this.aktiivisuus = akti; 
}
  nostaPalkkaa(prosentti) { 
    this.kkpalkka *= 1 + prosentti/100; }
  laskePalkka(){ return this.kkpalkka }
}

class Myyja extends Henkilo {
  constructor(nimi,sposti,palkka, akti)
 {
    super(nimi,sposti,palkka,akti);
    this.komissio = 0.05;
    this.myynti = 0;
 }
lisaaMyynti(maara) {
 this.myynti += maara }
laskeKomissio() {
 return this.myynti * this.komissio}
laskePalkka() {
 return super.laskePalkka() + this.laskeKomissio() }
 
}

const henkilo1 = new Henkilo("Maija Mehiläinen", "maija.mehilainen@company.com", 2000, true);
const myyja1 = new Myyja("Matti Meikäläinen", "matti.meikalaenen@company.com", 2000, true); 
console.log(henkilo1.nimi, "Peruspalkka:", henkilo1.laskePalkka());
myyja1.lisaaMyynti(10000);
console.log(myyja1.nimi, "Komissio:", myyja1.laskeKomissio()); 
console.log(myyja1.nimi, "Palkka:", myyja1.laskePalkka());

henkilo1.nostaPalkkaa(10);
console.log(henkilo1.nimi, "Uusi palkka:", henkilo1.laskePalkka());
myyja1.nostaPalkkaa(10);
console.log(myyja1.nimi, "Uusi palkka:", myyja1.laskePalkka());
