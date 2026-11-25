class Henkilo {
    constructor(nimi)
    {
        this.nimi = nimi;
    }
    esittele()
    {
        return `Minun nimeni on ${this.nimi}`;
    }
}

class Opettaja extends Henkilo{
    constructor(nimi, aihe)
    {
        super(nimi);
        this.aihe = aihe;
    }
    opettaa()
    {
        const teksti = `ja opetan ${this.aihe}a`;
        return teksti;
    }
    esittele()
    {
        return `${super.esittele()} ${this.opettaa()}`;
    }
}

class Opiskelija extends Henkilo{
    constructor(nimi, kurssi)
    {
        super(nimi);
        this.kurssi = kurssi;
    }
    opiskella()
    {
        return "ja opiskelen " + this.kurssi + "a";
    }
    esittele()
    {
        return `${super.esittele()} ${this.opiskella()}`;
    }
}

const juhaMatti = new Henkilo("Juha-Matti Holopainen");
console.log(juhaMatti.esittele());

const jyriPekka = new Opettaja("Jyri Lindroos", "Ohjelmointi");
console.log(jyriPekka.esittele());

const villeValo = new Opiskelija("Ville Valo", "Tieto- ja viestintätekniikka");
console.log(villeValo.esittele());