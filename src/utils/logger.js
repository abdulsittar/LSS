function logEvent(message) {
    console.log(`[LOG ${new Date().toISOString()}]: ${message}`);
  }
  
  module.exports = { logEvent };
  