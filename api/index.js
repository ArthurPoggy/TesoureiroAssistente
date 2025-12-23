// Vercel serverless entrypoint that reuses the Express app.
// Wrap explicitly to avoid any handler detection issues.
const app = require('../server/index.js');

module.exports = (req, res) => app(req, res);
