const memoryStore = require("../data/memoryStore");
const User = require("../models/User").default;

function generateUsers(n) {
  const users = [];

  for (let i = 0; i < n; i++) {
    const username = `user${i + 1}`;
    const email = `${username}@example.com`;
    const user = new User(i + 1, username, email);

    users.push(user);
    memoryStore.users.push(user);
  }

  return users;
}

module.exports = generateUsers;
