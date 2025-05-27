// src/simulation/runSimulation.js
const fs = require('fs');  // Import the filesystem module
const memoryStore = require('../data/memoryStore.js');
const User = require('../models/User.js');
const { createNetwork } = require('../network/networkController.js'); // Import the function directly
const { performUserAction } = require('../services/Actions.js');
const { Ranker } = require('../ranker/Ranker.js');
const { timedExecution } = require('../utils/helper');
const { saveTimingGraph, saveSentimentGraph, sentimentScoresLocal, sentimentScoresForComments } = require('../utils/chartHelper');
// Local utility to simulate req/res for network controller
function simulateNetworkRequest(body, callback) {
  const req = { body };
  const res = {
    // Add a mock `status` method
    status(code) {
      this.statusCode = code;  // You can store the status code if needed
      return this; // Chainable
    },
    // Add a mock `json` method to simulate the response body
    json(responseData) {
      callback(responseData);
    },
  };
  return [req, res];
}


// Optional: Probabilistic softmax-based choice
function softmaxChoice(utilities, lambda = 1) {
  const keys = Object.keys(utilities);
  const exps = keys.map(k => Math.exp(lambda * utilities[k]));
  const sum = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map(e => e / sum);

  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < probs.length; i++) {
    cumulative += probs[i];
    if (r < cumulative) return keys[i];
  }

  return keys[0]; // fallback
}

// Utility functions
function timeUtility(used, budget, cost) {
  const excess = used + cost - budget;
  return -Math.log(1 + Math.exp(excess));
}

function feedbackUtility(score) {
  return score >= 0 ? Math.log(1 + score) : -Math.log(1 - score);
}

function entertainmentUtility(score) {
  return score >= 0 ? Math.log(1 + score) : -Math.log(1 - score);
}

// Utility calculator for each action
function calculateActionUtility(action, user, context = {}) {
  const { used, total } = user.timeBudget;
  const weights = { time: 0.4, entertainment: 0.3, feedback: 0.3 };
  const actionCosts = { post: 5, comment: 3, like: 1, dislike: 1 };
  const cost = actionCosts[action] || 1;

  const U_time = timeUtility(used, total, cost);
  const U_ent = entertainmentUtility(context.entertainmentScore || 0);
  const U_fb = feedbackUtility(context.feedbackScore || 0);

  return (
    weights.time * U_time +
    weights.entertainment * U_ent +
    weights.feedback * U_fb
  );
}

function getAllUsers() {
  return memoryStore.users.map(user => {
    //user.logger = new SimpleLogger(); // Reattach logger
    return user;
  });
}


async function runSimulation() {
  const numOfUsers = parseInt(process.env.USERS, 10);
  const userIds = [];
  const ranker = new Ranker();

  // Create simulated users
  for (let i = 0; i < numOfUsers; i++) {
    const user = new User(i + 1, `user${i}`, `user${i}@example.com`);
    memoryStore.users.push(user);
    userIds.push(user._id); // Assuming User class sets this
  }

  // Simulate network generation
  const [req, res] = simulateNetworkRequest(
    {
      userIds,
      model: process.env.NETWORK,
      numOfUsers,
      m: 2,
    },
    (result) => {
      console.log("Network created:", result);
    }
  );

  //await createNetwork(req, res);
  //saveDataToJson();

  let users = getAllUsers();
  const totalUsers = users.length;

  for (let j = 0; j < process.env.ITERATIONS; j++) {
    users = getAllUsers(); // refresh in case changed

    const group1Limit = Math.floor(totalUsers * 0.25);  // 20%
    const group2Limit = group1Limit + Math.floor(totalUsers * 0.25);  // 30%
    const group3Limit = group2Limit + Math.floor(totalUsers * 0.25);  // 30%
    const group4Limit = group3Limit + Math.floor(totalUsers * 0.25);  // 20%

    for (let i = 0; i < totalUsers; i++) {
      const currentUser = users[i];
      const currentTime = Date.now();
      const isActive = await currentUser.activateUser(currentTime, currentUser.loggedIn);

      if (isActive) {
        await timedExecution('ranking', async () => {
          await ranker.fetchAndRankPosts();
        });

        let actionType;
        // Decision Logic: Calculate action utilities and decide on an action
        /*let actionType;
        const actions = ["post", "comment", "like", "dislike"];
        const utilities = {};

        for (const action of actions) {
          const context = {
            entertainmentScore:
              action === "post" ? currentUser.entertainmentScore : Math.random() * 2,
            feedbackScore:
              action === "post" ? currentUser.feedbackScore : Math.random() * 2,
          };

          utilities[action] = calculateActionUtility(action, currentUser, context);
        }

        // Optional: Probabilistic decision based on softmax
        actionType = softmaxChoice(utilities, 1.2);  // You can use either `decideUserAction(currentUser)` or `softmaxChoice(utilities)`
*/
        // Mapping action types to the respective actions

        // Assign actionType based on user index group
               if (i < group1Limit) {
          actionType = 0; // post
          
        } else if (i < group2Limit) {
          actionType = 1; // comment
          
        } else if (i < group3Limit) {
          actionType = 2; // like
          
        } else if (i < group4Limit) {
          actionType = 3; // dislike
          
        }
	      console.log("actionType");
	      console.log(actionType);
        await performUserAction(currentUser, actionType);
      }
    }
  }

  saveDataToJson();
}

async function generateSentimentGraph() {
  try {
    const { sentimentScores } = await sentimentScoresLocal(); // wait for resolved data

    if (!sentimentScores || Object.keys(sentimentScores).length === 0) {
      console.error("No sentiment scores returned.");
      return;
    }

    await saveSentimentGraph(sentimentScores, 'Analysis/posts_sentiment_scores_chart.png');
    console.log('Sentiment graph saved successfully!');
  } catch (err) {
    console.error('Error saving sentiment graph:', err);
  }
}

async function generateSentimentGraphComments() {
  try {
    const { sentimentScores } = await sentimentScoresForComments(); // wait for resolved data

    if (!sentimentScores || Object.keys(sentimentScores).length === 0) {
      console.error("No sentiment scores returned.");
      return;
    }

    await saveSentimentGraph(sentimentScores, 'Analysis/comments_sentiment_scores_chart.png');
    console.log('Sentiment graph saved successfully!');
  } catch (err) {
    console.error('Error saving sentiment graph:', err);
  }
}


function saveDataToJson() {
  const data = {
    users: memoryStore.users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      followers: user.followers,
      following: user.following,
      posts: user.posts,
      timeBudget: user.timeBudget,
      entertainmentScore: user.entertainmentScore,
      feedbackScore: user.feedbackScore,
      notificationEffect: user.notificationEffect,
      biases: user.biases,
      engagement: user.engagement,
      motivation: user.motivation,
      frustration: user.frustration,
      // Add any other user properties here as necessary
    })),
    posts: memoryStore.posts,  // Assuming posts are stored in memoryStore
    comments: memoryStore.comments,  // Assuming comments are stored in memoryStore
    likes: memoryStore.likes,
    dislikes: memoryStore.dislikes,
    rankingTiming: memoryStore.rankingTiming,
    postingTiming: memoryStore.postingTiming,
    commentingTiming: memoryStore.commentingTiming,
    likingTiming: memoryStore.likingTiming,
    dislikingTiming: memoryStore.dislikingTiming,
    RankingResults: memoryStore.RankingResults
    // You can also include any other data here
  };

  // Save the data to a JSON file
  fs.writeFileSync('Synthetic Data/simulation_data.json', JSON.stringify(data, null, 2), 'utf-8');
  console.log("Data saved to Synthetic Data/simulation_data.json");

  saveTimingGraph('ranking', 'Analysis/ranking_timing_chart.png');
  saveTimingGraph('posting', 'Analysis/posting_timing_chart.png');
  saveTimingGraph('commenting', 'Analysis/commenting_timing_chart.png');
  saveTimingGraph('liking', 'Analysis/liking_timing_chart.png');
  saveTimingGraph('disliking', 'Analysis/disliking_timing_chart.png');


  generateSentimentGraph();
  generateSentimentGraphComments();
}

module.exports = runSimulation;


