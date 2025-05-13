const { computePostFields } = require('./Ranking_Post');
const { Decay } = require('./Decay');
const { Engagement } = require('./Engagement');
const { Noise } = require('./Noise');
const { posts, comments, RankingResults } = require('../data/memoryStore');

class Ranker {
  constructor(logPath = null) {
    this.logPath = logPath;
  }

  rank(req) {
    const rankingMap = Object.fromEntries(
      req.items.map((post) => [post.id, this.computePostScore(req, post)])
    );

    return {
      logPath: this.logPath,
      request: req,
      rankingMap,
    };
  }

  computePostScore(req, post) {
    computePostFields(post);

    if (req.mode === 'random') {
      return Math.random();
    }

    if (req.mode === 'chronological') {
      return post.timestamp.getTime() / 1000;
    }

    const observations = [
      req.weights.likes * req.engagement.calculate(post.likes, req.referenceDatetime, req.decay),
      req.weights.dislikes * req.engagement.calculate(post.dislikes, req.referenceDatetime, req.decay),
      req.weights.reposts * req.engagement.calculate(post.reposts, req.referenceDatetime, req.decay),
      req.weights.comments * req.engagement.calculate(post.comments, req.referenceDatetime, req.decay),
      req.weights.commentsLikes * req.engagement.calculate(post.commentsLikes, req.referenceDatetime, req.decay),
      req.weights.commentsDislikes * req.engagement.calculate(post.commentsDislikes, req.referenceDatetime, req.decay),
    ];

    return (
      req.noise.generate() *
      (req.engagement.func === 'count_based'
        ? req.decay.calculate(post.timestamp, req.referenceDatetime) * observations.reduce((a, b) => a + b, 0)
        : observations.reduce((a, b) => a + b, 0))
    );
  }

  fetchAndRankPosts() {
    try {
      const referenceDatetime = new Date();

      const items = posts.map((post) => {
        const postComments = comments.filter((c) => c.postId === post.id);

        const likes = (post.likes || []).map(() => referenceDatetime); // Simulated timestamp
        const dislikes = (post.dislikes || []).map(() => referenceDatetime);

        const reposts = (post.reposts || []).map((repostId) => {
          const repost = posts.find((p) => p.id === repostId);
          return repost?.createdAt || referenceDatetime;
        });
        
        const commentsTimestamp = (postComments || []).map((c) => c.createdAt);
        const commentsLikes = (postComments || []).flatMap((c) => (c.likes || []).map(() => referenceDatetime));
        const commentsDislikes = (postComments || []).flatMap((c) => (c.dislikes || []).map(() => referenceDatetime));

        const timestamp = post.createdAt;

        return {
          id: post.id,
          //reposts,
          likes,
          dislikes,
          timestamp,
          comments: commentsTimestamp,
          commentsLikes,
          commentsDislikes,
        };
      });

      const mode = process.env.RANKER || 'count_based';
      const rankingPayload = {
        items,
        weights: {
          likes: 1.0,
          dislikes: 1.0,
          reposts: 1.0,
          comments: 1.0,
          commentsLikes: 1.0,
          commentsDislikes: 1.0,
        },
        engagement: new Engagement(mode, false),
        noise: new Noise(0.6, 1.4),
        decay: new Decay(0.2, 3 * 24 * 60 * 60), // 3 days in seconds
        referenceDatetime,
        mode,
      };

      const response = this.rank(rankingPayload);

      // Apply rank back to in-memory posts
      for (const [postId, rank] of Object.entries(response.rankingMap)) {
        const post = posts.find((p) => p.id === postId);
        if (post) {
          post.rank = rank;
        }
      }

      const rankingSnapshot = Object.entries(response.rankingMap).map(([id, rank]) => ({ postId: id, rank }));
      RankingResults.push(rankingSnapshot);

    } catch (error) {
      console.error('Error in fetchAndRankPosts:', error);
    }
  }
}

module.exports = { Ranker };
