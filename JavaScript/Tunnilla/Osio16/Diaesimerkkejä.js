// try {
//   JSON.parse("{broken}");
// } catch (error) {
//   console.log(error.name);
//   console.log(error.message);
//   console.log(error.stack);
// }

// function divide(a, b) {
//   if (b === 0) {
//     throw new Error("Nollalla ei voi jakaa");
//   }

//   return a / b;
// }

// console.log(divide(10, 2));
// console.log(divide(10, 0));

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

throw new ValidationError("Virheellinen sähköposti", "email");
