class Decay {
    constructor(minimum, referenceTimedelta) {
      this.minimum = minimum;
      this.referenceTimedelta = referenceTimedelta; // Seconds
    }
  
    calculate(observationDatetime, referenceDatetime) {
      const decay = 1.0 - (referenceDatetime.getTime() - observationDatetime.getTime()) / (this.referenceTimedelta * 1000);
      return Math.max(decay, this.minimum);
    }
  }
  
  module.exports = { Decay };
  