class Student {
  // Konstruktori
  constructor(name, points) {
    this.name = name;
    this.points = points;
    this.active = true;
  }

  // Pisteiden lisääminen
  addPoints(amount) {
    this.points += amount;
  }

  // Tervehdys
  greet() {
    return `Hei, olen ${this.name}!`;
  }

  // Getter: opiskelijan arvosana
  get grade() {
    return this.points >= 50 ? "Hyväksytty" : "Hylätty";
  }
}

// Luodaan kolme instanssia
const student1 = new Student("Aino", 45);
const student2 = new Student("Mika", 75);
const student3 = new Student("Sara", 90);

// Tulostetaan opiskelijoiden tiedot
console.log(student1.greet());
console.log(student1.grade);

console.log(student2.greet());
console.log(student2.grade);

console.log(student3.greet());
console.log(student3.grade);

// Lisätään Ainolle pisteitä
student1.addPoints(10);

console.log(student1.name);
console.log(student1.points);
console.log(student1.grade);

// Muutetaan Mikan aktiivisuutta
student2.active = false;

console.log(student2.active);
