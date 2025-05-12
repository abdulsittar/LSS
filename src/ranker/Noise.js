class Noise {
    constructor(low, high) {
      this.low = low;
      this.high = high;
    }
  
    generate() {
      return Math.random() * (this.high - this.low) + this.low;
    }
  
    drawSamples(n) {
      return Array.from({ length: n }, () => this.generate());
    }
  }
  