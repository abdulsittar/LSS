const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');
const memoryStore = require('../data/memoryStore');
const axios = require('axios');

const width = 800;
const height = 400;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

async function saveTimingGraph(label, outputPath) {
  const data = memoryStore[`${label}Timing`];

  if (!data || data.length === 0) {
    console.error(`No timing data for label: ${label}`);
    return;
  }

  const timestamps = data.map(d => new Date(d.timestamp).toLocaleTimeString());
  const durations = data.map(d => d.durationMs);

  const config = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [{
        label: `${label} Duration (ms)`,
        data: durations,
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: `${label} Timing Chart`
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Duration (ms)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Timestamp'
          }
        }
      }
    }
  };

  const image = await chartJSNodeCanvas.renderToBuffer(config);
  fs.writeFileSync(outputPath, image);
  console.log(`Chart saved to ${outputPath}`);
}

async function saveSentimentGraph(sentimentScores, outputPath) {
  const users = Object.keys(sentimentScores);
  const categories = ['hate', 'not_hate', 'non_offensive', 'irony', 'neutral', 'positive', 'negative'];

  const datasets = categories.map((category, index) => ({
    label: category,
    data: users.map(user => sentimentScores[user][category] || 0),
    backgroundColor: `hsl(${(index * 50) % 360}, 70%, 60%)`
  }));

  const config = {
    type: 'bar',
    data: {
      labels: users,
      datasets: datasets
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: 'Sentiment Scores by User'
        },
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Average Score'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Users'
          }
        }
      }
    }
  };

  const image = await chartJSNodeCanvas.renderToBuffer(config);
  fs.writeFileSync(outputPath, image);
  console.log(`Sentiment chart saved to ${outputPath}`);
}

async function sentimentScoresLocal() {
  try {
    const { users, posts } = memoryStore;

    // 1. Build userId → username map
    const userMap = {};
    for (const user of users) {
      userMap[user.id] = user.username || "Unknown";
    }

    // 2. Attach usernames to posts
    const postsWithUsernames = posts.map((post) => ({
      ...post,
      username: userMap[post.userId] || "Unknown",
    }));

    // 3. Group posts by username
    const groupedData = {};
    for (const post of postsWithUsernames) {
      const username = post.username;
      if (!groupedData[username]) groupedData[username] = [];
      groupedData[username].push(post);
    }

    // 4. Get top 10 users by number of posts
    const sortedUsers = Object.entries(groupedData)
      //.filter(([user]) => user !== "Unknown")
      //.sort((a, b) => b[1].length - a[1].length)
      //.slice(0, 10);

    const topUsernames = sortedUsers.map(([user]) => user);

    // 5. Prepare payload for sentiment API
    const samples = postsWithUsernames.map((p) => p.content || p.desc || "");
    const payload = { samples, threshold: 0.5 };

    const response = await axios.post("https://metrics.twon.uni-trier.de/", payload, {
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    const sentimentData = response.data.predictions || [];
    console.log(`sentimentData chart saved to ${sentimentData}`);
    console.log(`sentimentData chart saved to ${sentimentData}`);
    // 6. Map sample index to username
    const sampleToUser = {};
    postsWithUsernames.forEach((post, index) => {
      sampleToUser[index] = post.username;
    });

    // 7. Aggregate sentiment scores for top users
    const userScores = {};
    for (const username of topUsernames) {
      userScores[username] = {
        hate: [],
        not_hate: [],
        non_offensive: [],
        irony: [],
        neutral: [],
        positive: [],
        negative: [],
      };
    }
    console.log(userScores)
    sentimentData.forEach((item, index) => { 
      const user = sampleToUser[index];
      
      if (userScores[user]) {
        console.log(user)
        const results = item.results || {};
        userScores[user]["hate"].push(results.hate?.["HATE"] || 0);
        userScores[user]["not_hate"].push(results.hate?.["NOT-HATE"] || 0);
        userScores[user]["non_offensive"].push(results.offensive?.["non-offensive"] || 0);
        userScores[user]["irony"].push(results.irony?.["irony"] || 0);
        userScores[user]["neutral"].push(results.sentiment?.["neutral"] || 0);
        userScores[user]["positive"].push(results.sentiment?.["positive"] || 0);
        userScores[user]["negative"].push(results.sentiment?.["negative"] || 0);
      }
    }); 
    // 8. Compute average scores
    const finalScores = {};
    for (const [user, scores] of Object.entries(userScores)) {
      finalScores[user] = {};
      for (const [category, values] of Object.entries(scores)) {
        const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        finalScores[user][category] = parseFloat(avg.toFixed(4));
      }
    }
    
    console.log(finalScores)

    // 9. Return the result
    return {
      topUsers: topUsernames,
      sentimentScores: finalScores,
    };

  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    return { error: "Failed to analyze sentiment" };
  }
}


async function sentimentScoresForComments() {
  try {
    const { users, comments } = memoryStore;

    // 1. Build userId → username map
    const userMap = {};
    for (const user of users) {
      userMap[user.id] = user.username || "Unknown";
    }

    // 2. Attach usernames to comments
    const commentsWithUsernames = comments.map((comment) => ({
      ...comment,
      username: userMap[comment.userId] || "Unknown",
    }));

    // 3. Group comments by username
    const groupedData = {};
    for (const comment of commentsWithUsernames) {
      const username = comment.username;
      if (!groupedData[username]) groupedData[username] = [];
      groupedData[username].push(comment);
    }

    // 4. Get top users by comment count
    const sortedUsers = Object.entries(groupedData)
      //.filter(([user]) => user !== "Unknown")
      //.sort((a, b) => b[1].length - a[1].length)
      //.slice(0, 10);

    const topUsernames = sortedUsers.map(([user]) => user);

    // 5. Prepare payload for sentiment API
    const samples = commentsWithUsernames.map((c) => c.content || c.desc || "");
    const payload = { samples, threshold: 0.5 };

    const response = await axios.post("https://metrics.twon.uni-trier.de/", payload, {
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    const sentimentData = response.data.predictions || [];

    // 6. Map sample index to username
    const sampleToUser = {};
    commentsWithUsernames.forEach((comment, index) => {
      sampleToUser[index] = comment.username;
    });

    // 7. Aggregate sentiment scores for top users
    const userScores = {};
    for (const username of topUsernames) {
      userScores[username] = {
        hate: [],
        not_hate: [],
        non_offensive: [],
        irony: [],
        neutral: [],
        positive: [],
        negative: [],
      };
    }

    sentimentData.forEach((item, index) => {
      const user = sampleToUser[index];
      if (userScores[user]) {
        const results = item.results || {};
        userScores[user]["hate"].push(results.hate?.["HATE"] || 0);
        userScores[user]["not_hate"].push(results.hate?.["NOT-HATE"] || 0);
        userScores[user]["non_offensive"].push(results.offensive?.["non-offensive"] || 0);
        userScores[user]["irony"].push(results.irony?.["irony"] || 0);
        userScores[user]["neutral"].push(results.sentiment?.["neutral"] || 0);
        userScores[user]["positive"].push(results.sentiment?.["positive"] || 0);
        userScores[user]["negative"].push(results.sentiment?.["negative"] || 0);
      }
    });

    // 8. Compute average scores
    const finalScores = {};
    for (const [user, scores] of Object.entries(userScores)) {
      finalScores[user] = {};
      for (const [category, values] of Object.entries(scores)) {
        const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        finalScores[user][category] = parseFloat(avg.toFixed(4));
      }
    }

    // 9. Return the result
    return {
      topUsers: topUsernames,
      sentimentScores: finalScores,
    };

  } catch (error) {
    console.error("Error analyzing comment sentiment:", error);
    return { error: "Failed to analyze comment sentiment" };
  }
}

module.exports = { saveTimingGraph, saveSentimentGraph, sentimentScoresLocal, sentimentScoresForComments };
