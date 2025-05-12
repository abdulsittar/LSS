class PostLike {
    constructor({ id, userId, postId, isPublic = true }) {
      this.id = id;                       // Unique identifier
      this.userId = userId;               // ID of the user who liked the post
      this.postId = postId;               // ID of the liked post
      this.isPublic = isPublic;           // Visibility flag
      this.createdAt = new Date();        // Timestamp when like was created
      this.updatedAt = new Date();        // Timestamp for last update
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
  
  module.exports = PostLike;
  