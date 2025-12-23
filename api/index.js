// Vercel serverless entrypoint that reuses the Express app
const app = require('../server/index.js');

module.exports = app;
