class PostDislike {
    constructor({ id, userId, postId, isPublic = true }) {
      this.id = id;                       // Unique identifier (e.g., UUID or numeric)
      this.userId = userId;               // ID of the user who disliked the post
      this.postId = postId;               // ID of the disliked post
      this.isPublic = isPublic;           // Visibility flag
      this.createdAt = new Date();        // Timestamp when dislike was created
      this.updatedAt = new Date();        // Timestamp for updates
    }
  
    updateTimestamp() {
      this.updatedAt = new Date();
    }
  
    toJSON() {
      return {
        id: this.id,
        userId: this.userId,
        postId: this.postId,
        isPublic: this.isPublic,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      };
    }
  }
  
  module.exports = PostDislike;
  