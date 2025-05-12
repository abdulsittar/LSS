class Comment {
    constructor({ id, body, userId, username, postId, isPublic = true }) {
      this.id = id; // Can be a UUID or a number from an incremental counter
      this.body = body;
      this.userId = userId;       // Reference to User ID
      this.username = username;   // Optional: cached for easier simulation
      this.postId = postId;       // Reference to Post ID
      this.likes = [];            // Array of user IDs
      this.dislikes = [];         // Array of user IDs
      this.isPublic = isPublic;
      this.createdAt = new Date();
      this.updatedAt = new Date();
    }
  
    addLike(userId) {
      if (!this.likes.includes(userId)) {
        this.likes.push(userId);
        this.dislikes = this.dislikes.filter(id => id !== userId); // Remove from dislikes
        this.updatedAt = new Date();
      }
    }
  
    addDislike(userId) {
      if (!this.dislikes.includes(userId)) {
        this.dislikes.push(userId);
        this.likes = this.likes.filter(id => id !== userId); // Remove from likes
        this.updatedAt = new Date();
      }
    }
  
    removeLike(userId) {
      this.likes = this.likes.filter(id => id !== userId);
      this.updatedAt = new Date();
    }
  
    removeDislike(userId) {
      this.dislikes = this.dislikes.filter(id => id !== userId);
      this.updatedAt = new Date();
    }
  
    edit(newBody) {
      this.body = newBody;
      this.updatedAt = new Date();
    }
  
    toJSON() {
      return {
        id: this.id,
        body: this.body,
        userId: this.userId,
        username: this.username,
        postId: this.postId,
        likes: this.likes,
        dislikes: this.dislikes,
        isPublic: this.isPublic,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };
    }
  }
  
  module.exports = Comment;
  