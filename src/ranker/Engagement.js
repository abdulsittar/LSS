class Engagement {
  constructor(func, logNormalize) {
    this.func = func;
    this.logNormalize = logNormalize;
  }

  calculate(items, referenceDatetime, decay) {
    const score = this.func === 'count_based'
      ? items.length
      : this.getDecayedScore(items, referenceDatetime, decay);

    return this.logNormalize ? Math.log(score) : score;
  }

  getDecayedScore(items, referenceDatetime, decay) {
    return items.reduce((sum, item) => sum + decay.calculate(item, referenceDatetime), 0);
  }
}

module.exports = { Engagement };