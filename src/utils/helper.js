const memoryStore = require('../data/memoryStore');
const { posts,comments, dislikes, likes, postingTiming } = require('../data/memoryStore');

async function addslashes(str) {
  if (typeof str !== 'string') {
    return '';
  }
  return str.replace(/["']/g, '\\$&').replace(/\u0000/g, '\\0');
}

async function getThreadAgentOnComments(agent) {
  const postsThread = [];
  const postsReq = [];

  const today = new Date();
  const pastDate = new Date();
  pastDate.setDate(today.getDate() - 60);
  pastDate.setHours(0, 0, 0, 0);

  // Find eligible posts by this agent within the last 60 days
  const agentPosts = posts
    .filter(post => post.userId === agent.id && post.timestamp >= pastDate && post.timestamp < today)
    .sort((a, b) => (a.rank || 0) - (b.rank || 0))
    .slice(0, 1); // Get top-ranked post (or first one)

  for (const post of agentPosts) {
    const postComments = comments.filter(comment => comment.postId === post.id);

    if (postComments.length > 0) {
      postComments.forEach(comment => {
        postsReq.push({ message: `"${addslashes(comment.body)}"` });
      });
    }

    if (postsReq.length === 0) {
      postsReq.push({ message: `"${addslashes(post.content)}"` });
    }
  }

  if (postsReq.length > 0) {
    postsThread.push({ posts: postsReq });
  }

  return postsThread;
}

async function getInteractionsAgentOnPosts(agent) {
  const postsReq = []; 

  // Get up to 5 most recent posts by this user
  const userPosts = posts
    .filter(post => post.userId === agent.id)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  userPosts.forEach(post => postsReq.push({ action: "wrote", message: post.content }));

  // Get up to 5 most recent likes by this user
  const userLikes = likes
    .filter(like => like.userId === agent.id)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  for (const like of userLikes) {
    const likedPost = posts.find(post => post.id === like.postId);
    if (likedPost) {
      postsReq.push({ action: "liked", message: likedPost.content });
    }
  }

 

  return postsReq;
}

async function timedExecution(label, fn) {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();

  const durationMs = end - start;

  const timingRecord = {
    label,
    durationMs,
    timestamp: Date.now(),
  };

  // Determine which array to push to based on label
  switch (label) {
    case 'ranking':
      memoryStore.rankingTiming.push(timingRecord);
      break;
    case 'posting':
      memoryStore.postingTiming.push(timingRecord);
      break;
    case 'commenting':
      memoryStore.commentingTiming.push(timingRecord);
      break;
    case 'liking':
      memoryStore.likingTiming.push(timingRecord);
      break;
    case 'disliking':
      memoryStore.dislikingTiming.push(timingRecord);
      break;
    case 'history':
      memoryStore.historyTiming.push(timingRecord);
      break;
    default:
      memoryStore.togetherTiming.push(timingRecord);
      break;
  }

  return result;
}

module.exports = {
  timedExecution,
  getInteractionsAgentOnPosts,
  getThreadAgentOnComments,
  addslashes,
};