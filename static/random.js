// Fairly quick and dirty seeded random number gernerator based on
// https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript

export default class Random {
    constructor(seed_string) {
        let str = seed_string
        for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
            h = Math.imul(h ^ str.charCodeAt(i), 3432918353),
            h = h << 13 | h >>> 19;
        this.h = h;
    }

    int32() {
        this.h = Math.imul(this.h ^ this.h >>> 16, 2246822507);
        this.h = Math.imul(this.h ^ this.h >>> 13, 3266489909);
        return (this.h ^= this.h >>> 16) >>> 0;
    }

    uniform01() {  // float in the uniform range 0 to 1
        return this.int32() / 4294967296.;
    }
    uniform11() {  // float in the uniform range -1 to 1
        return this.uniform01() * 2 - 1;
    }
}
