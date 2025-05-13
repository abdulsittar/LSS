class User {
  constructor(id, username, email) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.followers = [];
    this.following = [];
    this.posts = [];
    this.loggedIn = false;
    this.timeBudget = { total: 100, used: 0 };
    
    // Randomizing values for each user
    this.entertainmentScore = Math.random() * 100; // Random score between 0 and 100
    this.feedbackScore = Math.random() * 100; // Random score between 0 and 100
    this.motivation = Math.random() * 100; // Random motivation between 0 and 100
    this.engagement = Math.random() * 100; // Random engagement between 0 and 100
    this.success = Math.random(); // Random success factor between 0 and 1
    this.notificationEffect = Math.random() * 2 + 0.5; // Random effect between 0.5 and 2
    this.frustration = Math.random() * 50; // Random frustration between 0 and 50
    this.biases = {}; // You can also randomize biases based on user characteristics
    this.opinionModel = { updateOpinion: () => {} };
    this.logger = { logEvent: (msg) => console.log(msg) };
    this.actor = { performActions: () => {} };
  }

  login() {
    this.loggedIn = true;
    console.log(`${this.username} logged in`);
  }

  logout() {
    this.loggedIn = false;
    console.log(`${this.username} logged out`);
  }

  post(content) {
    console.log(`${this.username} posted: ${content}`);
  }

  // --- User Logic & Utilities ---

  calculateTimeUtility(timeSpent, timeBudget) {
    const excessTime = Math.max(timeSpent - timeBudget, 0);
    const uBase = Math.log(1 + Math.exp(timeSpent - timeBudget));
    const penalty = excessTime > 0 ? Math.log(1 + 0.5) : 0;
    return -(uBase + 0.5 * penalty);
  }

  calculateFeedbackUtility(feedbackScore) {
    return feedbackScore >= 0
      ? Math.log(1 + feedbackScore)
      : -1 * Math.log(1 - feedbackScore);
  }

  calculateEntertainmentUtility(entertainmentScore) {
    return entertainmentScore >= 0
      ? Math.log(1 + entertainmentScore)
      : -1 * Math.log(1 - entertainmentScore);
  }

  calculateEUon() {
    const { used, total } = this.timeBudget;
    const timeUtility = this.calculateTimeUtility(used, total);
    const feedbackUtility = this.calculateFeedbackUtility(this.feedbackScore);
    const entertainmentUtility = this.calculateEntertainmentUtility(this.entertainmentScore);
    return 0.4 * timeUtility + 0.3 * entertainmentUtility + 0.3 * feedbackUtility;
  }

  calculateNetUtilityDifference(EUon) {
    return EUon - 0; // EUoff assumed to be 0
  }

  calculateLogonProbability() {
    const EUon = this.calculateEUon();
    const delta = this.calculateNetUtilityDifference(EUon);
    const sensitivity = 1.5;
    return 1 / (1 + Math.exp(-1 * sensitivity * delta));
  }

  async activateUser(currentTime, online) {
    const EUon = this.calculateEUon();
    const logonProb = this.calculateLogonProbability();
    console.log("logonProb:", logonProb);
    console.log("timeBudget:", this.timeBudget.total);
    
    if (isNaN(EUon) || isNaN(logonProb)) {
      console.error("Invalid utility calculation.");
      return false;
    }

    if (this.timeBudget.total > 0 && logonProb >= 0.5) {
      this.loggedIn = true;
      this.logger.logEvent(`User ${this.username} activated at ${currentTime}`);
      this.actor.performActions(this);
      return true;
    } else {
      this.loggedIn = false;
      this.logger.logEvent(`User ${this.username} deactivated at ${currentTime}`);
      return false;
    }
  }

  updateOpinion(reactions) {
    this.opinionModel.updateOpinion(reactions);
  }

  performActions() {
    this.actor.performActions(this);
  }
}

module.exports = User;


