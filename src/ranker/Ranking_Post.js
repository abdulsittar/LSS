
const computePostFields = (post) => {
  post.comments = post.comments.map((comment) => comment ?? new Date());
  post.commentsLikes = post.likes.map((comment) => comment ?? new Date());
  post.commentsDislikes = post.dislikes.map((comment) => comment ?? new Date());
};

module.exports = {
  computePostFields,
};
