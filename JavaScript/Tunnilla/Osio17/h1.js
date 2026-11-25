class Student {
  // Konstruktori
  #pisteet = 0;
  constructor(nimi, pisteet) {
    this.nimi = nimi;
    if(pisteet > 0)
    {
      this.#pisteet = pisteet;
    }
    else{
      this.#pisteet = 0;
    }
    this.active = true;
  }

  // Pisteiden lisääminen
  addPoints(amount) {
    amount > 0 ? this.#pisteet += amount : this.#pisteet;
  }

  // Tervehdys
  greet() {
    return `Hei, olen ${this.nimi}!`;
  }

  // Getter: opiskelijan arvosana
  get grade() {
    return this.#pisteet >= 50 ? "Hyväksytty" : "Hylätty";
  }
  get pisteet()
  {
    return this.#pisteet;
  }
}

// Luodaan kolme instanssia
const student1 = new Student("Aino", 45);
const student2 = new Student("Mika", 75);
const student3 = new Student("Sara", 90);

// Tulostetaan opiskelijoiden tiedot
console.log(student1.greet(), "minun kokeeni on ", student1.grade,student1.grade === "Hyväksytty"?"👍":"👎");

console.log(student2.greet(), "minun kokeeni on ", student2.grade,student2.grade === "Hyväksytty"?"👍":"👎");

console.log(student3.greet(), "minun kokeeni on ", student3.grade,student3.grade === "Hyväksytty"?"👍":"👎");

// Lisätään Ainolle pisteitä
student1.addPoints(10);

console.log(student1.nimi,"pisteet: ", student1.pisteet,"eli koe on ",student1.grade,student1.grade === "Hyväksytty"?"👍":"👎");

// Muutetaan Mikan aktiivisuutta
student2.active = false;

console.log("Käyttäjän ",student2.nimi, "aktiivisuuden tila on: ",student2.active);
