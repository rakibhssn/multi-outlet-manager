// Vercel serverless entry: every /api/*, /health and /uploads/* request
// is rewritten here (see vercel.json) and handled by the Express app.
module.exports = require("../backend/server");
