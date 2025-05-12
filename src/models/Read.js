class Read {
    constructor({ id, userId, postId, isPublic = true }) {
      this.id = id;                  // Unique identifier
      this.userId = userId;          // User who read the post
      this.postId = postId;          // ID of the post that was read
      this.isPublic = isPublic;      // Visibility flag
      this.createdAt = new Date();   // Timestamp for creation
      this.updatedAt = new Date();   // Timestamp for last update
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
  
  module.exports = Read;
  