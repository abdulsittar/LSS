const { users, posts, comments, likes, dislikes } = require('../data/memoryStore.js');
const { Together } = require('together-ai');

require('dotenv').config();
const { timedExecution, getInteractionsAgentOnPosts, getThreadAgentOnComments  } = require('../utils/helper');

const apiKey = process.env.TOGETHER_API_KEY;
const topic = process.env.TOPIC;
const posting_model = process.env.TESTING_MODEL;//process.env.POSTING_MODEL;//"mistralai/Mistral-7B-Instruct-v0.2";  
const replying_model = process.env.TESTING_MODEL;//"mistralai/Mistral-7B-Instruct-v0.2"; 

const togetherClient = new Together({
  apiKey: apiKey,  
});

async function performUserAction(user, actionType) {
  switch (actionType) {
    case 0:
      await timedExecution('posting', async () => {
        await generatePost(user);
      });
      break;
    case 1:
      await timedExecution('commenting', async () => {
        await commentOnPost(user);
    });
      break;
    case 2:
      await timedExecution('liking', async () => {
        await likeAPost(user);
    });
      break;
    case 3:
      await timedExecution('disliking', async () => {
        await dislikeAPost(user);
      });
      break;
    default:
      console.warn("Unknown action type:", actionType);
  }
}

async function generatePost(user) {
  try {
    const persona = `You are a social media user with a political neutral leaning. Post a Tweet about the following topic:`;
    // Simulate getting user interactions from memory
    const userInteractions = await getInteractionsAgentOnPosts(user);
    const thread = await getThreadAgentOnComments(user);
    
  
    let prompt = `${topic}\n${persona}\n-----------------`;
    if (userInteractions.length > 0) {
      prompt += `\nYour recent interactions:\n${JSON.stringify(userInteractions, null, 2)}\n-----------------`;
    }
    prompt += `\nYour native language is English. Use this language in your response. You are browsing the online social network Twitter and adhere to the style of the platform. Write a few-word social media post on the following topic based on your personality.`;

    if (thread.length > 0) {
      prompt += `\n-----------------\nEngage naturally in the conversation by responding concisely to this thread:\n${JSON.stringify(thread, null, 2)}\n-----------------`;
    }
    prompt += `\nResponse:`;
    try {
    const generatedPost = await togetherClient.chat.completions.create({
      messages: [
          { "role": "system", "content": persona },
          { "role": "user", "content": prompt }
      ],
      model: posting_model
  });
  
  
  
  // const togetherResponse = await client.chat.completions.create(params); // Unused, commented out
  const reply = generatedPost.choices && generatedPost.choices[0] && generatedPost.choices[0].message && generatedPost.choices[0].message.content 
      ? generatedPost.choices[0].message.content.trim() 
      : '';
      
    //const reply = "This is a dummy generated post."; // mock reply for testing without LLM

    if (reply) {
      posts.push({
        id: generateId(),
        userId: user.id,
        username: user.username,
        content: reply,
        timestamp: Date.now(),
      });

      user.timeBudget.total = Math.max(0, user.timeBudget.total - 20);
      user.timeBudget.used += 20;

      console.log(`Post created by ${user.username}:`, reply);
      console.log(`Total time reduced to ${user.username}:`, user.timeBudget.total);
      console.log(`Used time increased for ${user.username}:`, user.timeBudget.used);
    } else {
      console.log(`No content generated for ${user.username}. Adding penalty time.`);
    }
    
    console.log("Generated Post:", reply);
    } catch (error) {
      console.error("Error generating post:", error);
    }

  } catch (err) {
    console.error("Error in generatePost:", err);
  }
}

async function generatePost2(user) {
  const persona = `You are a neutral user on a political social platform.`;
  const prompt = `${topic}\n${persona}\nResponse:`;

  const response = {"role": "system"}//await tg.chat.completions.create({
    //messages: [{ role: "system", content: persona }, { role: "user", content: prompt }],
    //model: posting_model,
  //});

  const content = "dummy"//response.choices?.[0]?.message?.content?.trim();

  if (content) {
    posts.push({
      id: generateId(),
      userId: user.id,
      content,
      timestamp: Date.now(),
    });
    
    user.timeBudget.total = Math.max(0, user.timeBudget.total - 20); // Deduct 10 but ensure it doesn't go below 0
    user.timeBudget.used += 20;
    
    console.log(`Post created by ${user.username}:`, content); 
    console.log(`Total time reduced to ${user.username}:`, user.timeBudget.total);
    console.log(`used increased to ${user.username}:`, user.timeBudget.used);
  }
}

async function commentOnPost(user) { 
    try {
      const persona = `You are a social media user with a politically neutral leaning. Respond to the following Tweet:`;
  
      // Get posts sorted by rank descending (in memory)
      let sortedPosts = [...posts].sort((a, b) => b.rank - a.rank);
  
      if (sortedPosts.length === 0) {
        console.warn("⚠️ No posts available for reply.");
        return null;
      }
  
      const post = sortedPosts[0]; // Top ranked post
      const thread = await getThreadAgentOnComments(user);
      const interactions = await getInteractionsAgentOnPosts(user);
  
      let prompt = `You are browsing the online social network Twitter and adhering to the style of the platform. Respond concisely in a few words to the post, based on your personality.\n`;
  
      if (interactions.length > 0) {
        prompt += `\nYour recent interactions:\n${JSON.stringify(interactions, null, 2)}\n-----------------`;
      }
  
      if (thread.length > 0) {
        prompt += `\nRespond to this thread:\n${JSON.stringify(thread, null, 2)}\n-----------------`;
      }
  
      prompt += `\nResponse:`;
  
      const response = await togetherClient.chat.completions.create({
        messages: [
          { role: "system", content: persona },
          { role: "user", content: prompt }
        ],
        model: replying_model,
      });
  
      const replyText = response.choices?.[0]?.message?.content?.trim();
  
      if (replyText) {
        await addAComment(user, replyText, user.id, post.id, user.username);
      }
      user.timeBudget.total = Math.max(0, user.timeBudget.total - 20); // Deduct 10 but ensure it doesn't go below 0
      user.timeBudget.used += 20;

        console.log(`${user.username} commented on post ${post.id}:`, replyText);
        console.log(`Total time reduced to ${user.username}:`, user.timeBudget.total);
        console.log(`used increased to ${user.username}:`, user.timeBudget.used);
  
    } catch (err) {
      console.error("❌ Error in agentReplyCommentLoop:", err);
      return null;
    }
  }



async function likePost(user) {
  if (posts.length === 0) return;

  const post = posts[Math.floor(Math.random() * posts.length)];

  likes.push({
    type: 'like',
    postId: post.id,
    userId: user.id,
    timestamp: Date.now(),
  });

  user.timeBudget.total = Math.max(0, user.timeBudget.total - 5); // Deduct 10 but ensure it doesn't go below 0
  user.timeBudget.used += 5;
  
  console.log(`${user.username} liked post ${post.id}`);
  console.log(`Total time reduced to ${user.username}:`, user.timeBudget.total);
  console.log(`used increased to ${user.username}:`, user.timeBudget.used);
}

async function dislikePost(user) {
  if (posts.length === 0) return;

  const post = posts[Math.floor(Math.random() * posts.length)];

  dislikes.push({
    type: 'dislike',
    postId: post.id,
    userId: user.id,
    timestamp: Date.now(),
  });
  
  user.timeBudget.total = Math.max(0, user.timeBudget.total - 5); // Deduct 10 but ensure it doesn't go below 0
  user.timeBudget.used += 5;
  
  console.log(`${user.username} disliked post ${post.id}`);
  console.log(`Total time reduced to ${user.username}:`, user.timeBudget.total);
  console.log(`used increased to ${user.username}:`, user.timeBudget.used);
}

// Helper to generate unique IDs (simplified)
function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

async function addAComment(user, desc, userId, postId, username) {
  if (!desc || desc.length === 0) return;

  const post = posts.find(p => p.id === postId);
  if (!post) return;

  const comment = {
    id: generateId(),
    body: desc,
    userId,
    postId,
    username,
    timestamp: Date.now(),
    isPublic: false
  };

  comments.push(comment);

  if (!post.commentIds) post.commentIds = [];
  post.commentIds.push(comment.id);
}

async function likeAPost(user, postId) {
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  const existing = reactions.find(r => r.postId === postId && r.userId === user.id);
  if (!existing) {
    reactions.push({
      id: generateId(),
      userId: user.id,
      postId,
      type: "like"
    });
  }
}

async function dislikeAPost(user, postId) {
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  const existing = reactions.find(r => r.postId === postId && r.userId === user.id);
  if (!existing) {
    reactions.push({
      id: generateId(),
      userId: user.id,
      postId,
      type: "dislike"
    });
  }
}

async function toggleLikeDislikePost(user, postId) {
  const reactionIndex = reactions.findIndex(r => r.postId === postId && r.userId === user.id);
  if (reactionIndex >= 0) {
    reactions.splice(reactionIndex, 1);
  } else {
    reactions.push({
      id: generateId(),
      userId: user.id,
      postId,
      type: "like"
    });
  }
}

async function user_Reply_Comment_Loop(user) {
  const recentComments = comments
    .filter(c => c.userId !== user.id)
    .slice(-5); // last 5

  for (const comment of recentComments) {
    const shouldReply = Math.random() < 0.5;
    if (!shouldReply) continue;

    const reply = {
      id: generateId(),
      body: `Reply from ${user.username}`,
      userId: user.id,
      postId: comment.postId,
      username: user.username,
      timestamp: Date.now(),
      isPublic: false
    };

    comments.push(reply);

    const post = posts.find(p => p.id === comment.postId);
    if (post) {
      if (!post.commentIds) post.commentIds = [];
      post.commentIds.push(reply.id);
    }
  }
}

module.exports = {
  performUserAction,
};