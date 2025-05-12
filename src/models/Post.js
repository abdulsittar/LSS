class Post {
    constructor({
      id,
      userId,
      desc,
      img = null,
      isPublic = true,
      reposts = [],
      pool = "0",
      rank = 0,
      likes = [],
      dislikes = [],
      comments = [],
      postedBy = null
    }) {
      this.id = id;
      this.userId = userId;
      this.desc = desc;
      this.img = img;
      this.isPublic = isPublic;
      this.reposts = reposts;
      this.pool = pool;
      this.rank = rank;
      this.likes = likes;         // Array of user IDs
      this.dislikes = dislikes;   // Array of user IDs
      this.comments = comments;   // Array of comment objects or IDs
      this.postedBy = postedBy;   // User ID
      this.createdAt = new Date();
      this.updatedAt = new Date();
    }
  
    addLike(userId) {
      if (!this.likes.includes(userId)) {
        this.likes.push(userId);
        this.dislikes = this.dislikes.filter(id => id !== userId);
        this.updatedAt = new Date();
      }
    }
  
    addDislike(userId) {
      if (!this.dislikes.includes(userId)) {
        this.dislikes.push(userId);
        this.likes = this.likes.filter(id => id !== userId);
        this.updatedAt = new Date();
      }
    }
  
    addComment(comment) {
      this.comments.push(comment);
      this.updatedAt = new Date();
    }
  
    addRepost(repostId) {
      this.reposts.push(repostId);
      this.updatedAt = new Date();
    }
  
    updateDescription(newDesc) {
      this.desc = newDesc;
      this.updatedAt = new Date();
    }
  
    toJSON() {
      return {
        id: this.id,
        userId: this.userId,
        username: this.username,
        desc: this.desc,
        img: this.img,
        isPublic: this.isPublic,
        reposts: this.reposts,
        pool: this.pool,
        rank: this.rank,
        likes: this.likes,
        dislikes: this.dislikes,
        comments: this.comments,
        postedBy: this.postedBy,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };
    }
  }
  
  module.exports = Post;
  