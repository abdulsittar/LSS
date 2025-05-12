class CommentDislike {
  constructor({ id, userId, commentId, isPublic = true }) {
    this.id = id;                         // Unique identifier
    this.userId = userId;                 // ID of the user who disliked the comment
    this.commentId = commentId;           // ID of the disliked comment
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
      commentId: this.commentId,
      isPublic: this.isPublic,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = CommentDislike;
