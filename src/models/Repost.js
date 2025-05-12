class Repost {
    constructor({ id, userId, originalPostId, isPublic = true }) {
      this.id = id;                         // Unique identifier
      this.userId = userId;                 // User who is reposting
      this.originalPostId = originalPostId; // ID of the post being reposted
      this.isPublic = isPublic;             // Visibility flag
      this.createdAt = new Date();          // Timestamp for creation
      this.updatedAt = new Date();          // Timestamp for last update
    }
  
    updateTimestamp() {
      this.updatedAt = new Date();
    }
  
    toJSON() {
      return {
        id: this.id,
        userId: this.userId,
        originalPostId: this.originalPostId,
        isPublic: this.isPublic,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      };
    }
  }
  
  module.exports = Repost;
6  