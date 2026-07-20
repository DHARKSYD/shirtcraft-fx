// server/utils/corsOrigins.js
//
// CLIENT_URL is usually just the production frontend URL, but Vercel gives
// every deploy its own preview URL too. Accepting a comma-separated list
// here means the same Render backend can serve production and preview
// deploys (and local dev) without redeploying every time a preview URL
// changes.
//
//   CLIENT_URL=https://shirtcraft.vercel.app,https://shirtcraft-git-preview.vercel.app

function getAllowedOrigins() {
  const raw = process.env.CLIENT_URL || 'http://localhost:5173';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

// A cors()-compatible origin function: reflects the request's origin back
// only if it's in the allow-list, otherwise blocks it. Requests with no
// Origin header (server-to-server, curl, mobile apps) are allowed through.
function corsOriginCheck(origin, callback) {
  const allowed = getAllowedOrigins();
  if (!origin || allowed.includes(origin)) return callback(null, true);
  callback(new Error(`CORS: origin ${origin} is not allowed`));
}

module.exports = { getAllowedOrigins, corsOriginCheck };
