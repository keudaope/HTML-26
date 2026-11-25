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
  naytaPalkka(){ return this.kkpalkka }
}


class Myyja extends Henkilo {
  constructor(nimi,sposti,palkka, akti)
 {
    super(nimi,sposti,palkka,akti);
    this.provisio = 0.05;
    this.myynti = 0;
 }
lisaaMyynti(maara) {
 this.myynti += maara }
laskeKomissio() {
 return this.myynti * this.provisio}
naytaPalkka() {
 return super.naytaPalkka() + this.laskeKomissio() }
 
}

class Kehittaja extends Henkilo {
  constructor(nimi,sposti,palkka,akti)
  {
    super(nimi,sposti,palkka,akti);
    this.kieli = "JavaScript";
    this.projektibonus = 10;
  }
  laskePalkka(){
    this.palkka = super.naytaPalkka() + super.naytaPalkka() * this.projektibonus / 100;
    return this.palkka;
  }
  naytaPalkka()
  {
    return this.laskePalkka();
  }
}

class Esihenkilo extends Henkilo{
  constructor (nimi, sposti, palkka,akti)
  {
    super(nimi, sposti, palkka, akti);
    this.tiiminkoko = 10;
    this.vastuulisa = 442;
  }
  laskePalkka()
  {
    this.palkka = super.naytaPalkka() + this.vastuulisa;
    return this.palkka;
  }
  naytaPalkka()
  {
    return this.laskePalkka();
  }
}

const henkilo1 = new Henkilo("Maija Mehiläinen", "maija.mehilainen@company.com", 2000, true);
const myyja1 = new Myyja("Matti Meikäläinen", "matti.meikalaenen@company.com", 2000, true); 
console.log(henkilo1.nimi, "Peruspalkka:", henkilo1.naytaPalkka());
myyja1.lisaaMyynti(10000);
console.log(myyja1.nimi, "Provisio:", myyja1.laskeKomissio()); 
console.log(myyja1.nimi, "Palkka:", myyja1.naytaPalkka());

henkilo1.nostaPalkkaa(10);
console.log(henkilo1.nimi, "Uusi palkka:", henkilo1.naytaPalkka());
myyja1.nostaPalkkaa(10);
console.log(myyja1.nimi, "Uusi palkka:", myyja1.naytaPalkka());

const javaOhjelmoija = new Kehittaja("Olli Ohukainen","olli.ohukainen@company.com", 5000, true);
console.log(javaOhjelmoija.nimi, "Uusipalkka: ", javaOhjelmoija.naytaPalkka());
const cOhjelmoija = new Kehittaja("Cesil Cyhty", "cesil.cyhty@company.com", 5500, true);
console.log(cOhjelmoija.nimi, "Palkka: ", cOhjelmoija.naytaPalkka());
const ohjelmistoTiimi = new Esihenkilo("Kimmo Kauniainen", "kimmo.kauniainen@company.com", 4200, true);
console.log(ohjelmistoTiimi.nimi, "Palkka: ", ohjelmistoTiimi.naytaPalkka());
class Student {
  constructor(name) { this.name = name; }
  greet() { return `Hei, olen ${this.name}`; }
}

const joni = new Student("Joni Tuovinen");
console.log(joni.greet());
