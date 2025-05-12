class TimeBudget {
    constructor(totalTime = 5, replenishRate = 10, usedTime = 0) {
      this.totalTime = totalTime;         // Total time budget for the user
      this.replenishRate = replenishRate; // Rate at which time replenishes per cycle
      this.usedTime = usedTime;           // Time already used
    }
  
    // Use time from the budget
    useTime(amount) {
      if (this.usedTime + amount <= this.totalTime) {
        this.usedTime += amount;
        return true;
      } else {
        console.warn('Not enough time left in the budget.');
        return false;
      }
    }
  
    // Replenish time (e.g., at each simulation step)
    replenish() {
      this.totalTime += this.replenishRate;
    }
  
    // Get remaining time
    get remaining() {
      return Math.max(this.totalTime - this.usedTime, 0);
    }
  
    // Reset used time (e.g., at the start of a new day)
    resetUsedTime() {
      this.usedTime = 0;
    }
  }
  
  module.exports = TimeBudget;
  