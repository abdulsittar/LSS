const { computePostFields } = require('./Ranking_Post');
const { Decay } = require('./Decay');
const { Engagement } = require('./Engagement');
const { Noise } = require('./Noise');
//const responseLogger = require('../utils/logs/logger');

class Ranker {
  constructor(logPath) {
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


  async fetchAndRankPosts() {
    try {
      const posts = await Post.find()
        .populate('reposts')
        .populate('likes')
        .populate('dislikes')
        .populate('comments')
        .lean()
        .exec();

      //responseLogger.info("Ranked total posts", posts.length);
      //responseLogger.info(posts.length);

      // Process posts and map them to the Ranking_Post format
        const items = posts.map((post) => {
        const reposts = post.reposts.map((r) => r.createdAt);
        const likes = post.likes.map((l) => l.createdAt);
        const dislikes = post.dislikes.map((d) => d.createdAt);
        const commentsTimestamp = post.comments.map((comment) => comment.createdAt ?? new Date());
        const commentsLikes = post.comments.flatMap((comment) =>
          Array.isArray(comment.likes)
            ? comment.likes.map((like) => like.createdAt).filter((createdAt) => createdAt instanceof Date)
            : []
        );
        const commentsDislikes = post.comments.flatMap((comment) =>
          Array.isArray(comment.dislikes)
            ? comment.dislikes.map((dislike) => dislike.createdAt).filter((createdAt) => createdAt instanceof Date)
            : []
        );

        if (!post.createdAt) {
          throw new Error('Post createdAt is undefined. Ensure this field is populated in your database.');
        }

        const timestamp = post.createdAt;
        return {
          id: post._id.toString(),
          reposts,
          likes,
          dislikes,
          timestamp,
          comments: commentsTimestamp,
          commentsLikes,
          commentsDislikes,
        };
      });

      // Define ranking parameters
      const mode = 'count_based';  // Can be dynamically assigned
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
        engagement: new Engagement('count_based', false),
        noise: new Noise(0.6, 1.4),
        decay: new Decay(0.2, 3 * 24 * 60 * 60), // Decay with 3 days in seconds
        referenceDatetime: new Date(),
        mode: mode, // Dynamically assigned, but still one of the allowed values
      };

      // Timing the ranking process
      const response = this.rank(rankingPayload);

      // Bulk update posts with their ranks
      const bulkOps = [];
      for (const [postId, rank] of Object.entries(response.rankingMap)) {
        bulkOps.push({
          updateOne: {
            filter: { _id: postId },
            update: { $set: { rank } },
          },
        });
      }

      if (bulkOps.length > 0) {
        await Post.bulkWrite(bulkOps);
      }

      // Optional: Update individually if needed (can be removed if bulkWrite is enough)
      // for (const [postId, rank] of Object.entries(response.rankingMap)) {
      //   await Post.updateOne({ _id: postId }, { $set: { rank } });
      // }

    } catch (error) {
      //responseLogger.info("Error fetching or ranking posts:", error);
    } finally {
      //responseLogger.info("Database connection closed.");
    }
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
}

module.exports = { Ranker };
