// src/simulation/runSimulation.js
const fs = require('fs');  // Import the filesystem module
const memoryStore = require('../data/memoryStore.js');
const User = require('../models/User.js');
const { createNetwork } = require('../network/networkController.js'); // Import the function directly
const { performUserAction } = require('../services/Actions.js'); 

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

function getAllUsers() {
  return memoryStore.users.map(user => {
    //user.logger = new SimpleLogger(); // Reattach logger
    return user;
  });
}

async function runSimulation() {
  const numOfUsers = 10;
  const userIds = [];

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
      model: 'Barabasi',
      numOfUsers,
      m: 2,
    },
    (result) => {
      console.log("Network created:", result);
    }
  );

  await createNetwork(req, res);
  //saveDataToJson();

  let users = getAllUsers();
  const totalUsers = users.length;

  for (let j = 0; j < 30; j++) {
    users = getAllUsers(); // refresh in case changed
    const group1Limit = Math.floor(totalUsers * 0.2);  // 20%
    const group2Limit = group1Limit + Math.floor(totalUsers * 0.3);  // 50%
    const group3Limit = group2Limit + Math.floor(totalUsers * 0.3);  // 80%

    for (let i = 0; i < totalUsers; i++) {
      const currentUser = users[i];
      const currentTime = Date.now();
      const isActive = await currentUser.activateUser(currentTime, currentUser.loggedIn);

      if (isActive) {
        let actionType;

        if (i < group1Limit) {
          actionType = 0; // post
        } else if (i < group2Limit) {
          actionType = 1; // comment
        } else if (i < group3Limit) {
          actionType = 2; // like
        } else {
          actionType = 3; // dislike
        }

        await performUserAction(currentUser, actionType);

        // Custom logic for dislike action
        if (actionType === 3) {
          try { 
            let localUserIds = memoryStore.users.map(u => u._id);
            localUserIds = shuffleArray(localUserIds);
            const currentUser = (i + 1) % totalUsers;

            const {  userFeatures, actionLabels, validUserIds } = await fetchUserFeaturesAndLabels(localUserIds, currentUser);

            if (userFeatures.length > 0 && actionLabels.length > 0) {
              const probabilities = await SimulationService.getUserActionProbabilities(userFeatures, actionLabels);
              await updateUserScores(validUserIds, probabilities);

              const bestMatch = await getHighestLikelihoodPostAndUser(localUserIds);
              const user_1 = memoryStore.users.find(u => u._id === bestMatch?.userId);
              const post_1 = memoryStore.posts.find(p => p._id === bestMatch?.postId);

              if (user_1 && post_1) {
                await performUserAction(user_1, actionType, post_1);
                await setBestMatchProbabilityToZero([bestMatch.userId]);
              } else {
                console.error(`User or post not found for best match`);
              }
            }
          } catch (error) {
            console.error("Simulation error:", error);
          }
        }
      }
    }
  }
  
  saveDataToJson();

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
    dislikes: memoryStore.dislikes
    // You can also include any other data here
  };

  // Save the data to a JSON file
  fs.writeFileSync('simulation_data.json', JSON.stringify(data, null, 2), 'utf-8');
  console.log("Data saved to simulation_data.json");
}

async function getUserActionProbabilities(userFeatures, actionLabels) {
  try {
    const batch_history1 = [...userFeatures];
    let batch_post1 = [...actionLabels];

    responseLogger.info(batch_history1.length);
    responseLogger.info(batch_post1.length);

    let response;
    if (batch_history1.length === 1) {
      const batch_history = batch_history1[0];
      let batch_post = batch_post1[0];
      batch_post = shuffleArray(batch_post);

      response = await axios.post('http://127.0.0.1:5001/predict', {
        batch_history,
        batch_post
      });
    } else {
      const batch_history = batch_history1;
      let batch_post = batch_post1[0];
      batch_post = shuffleArray(batch_post);

      response = await axios.post('http://127.0.0.1:5001/predict', {
        batch_history,
        batch_post
      });
    }

    const probabilities = response.data.predictions;
    responseLogger.info(`Probabilities: ${probabilities}`);
    return probabilities;
  } catch (error) {
    console.error('Error calling Flask API:', error);
    throw new Error('Failed to get predictions from Flask API');
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // Pick a random index
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

function getLatestPost() {
  // Assuming posts are sorted by timestamp descending
  return memoryStore.posts
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Utility to get all posts by a user
function getPostsByUser(userId) {
  return memoryStore.posts.filter(post => post.userId === userId);
}

const fetchUserFeaturesAndLabels = async (userIds, exclude) => {
  const userFeatures = [];
  const actionLabels = [];
  const validUserIds = [];

  let count = 0;
  let latestPost = getLatestPost();
  latestPost = latestPost.filter((_, index) => index !== exclude);
  userIds = userIds.filter((_, index) => index !== exclude);

  for (const userId of userIds) {
    const userPosts = getPostsByUser(userId);
    const randomNumber = Math.floor(Math.random() * userIds.length);

    if (userPosts.length > 1) {
      userFeatures.push([userPosts[0].desc, userPosts[1].desc]);
      validUserIds.push(userId);

      if (latestPost[randomNumber]) {
        actionLabels.push([latestPost[randomNumber].desc]);
      } else {
        actionLabels.push(['No post available']);
      }
    }

    count++;
  }

  return { userFeatures, actionLabels, validUserIds };
};

module.exports = runSimulation;

