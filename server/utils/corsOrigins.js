// server/utils/corsOrigins.js
//
// CLIENT_URL is usually just the production frontend URL, but Vercel gives
// every deploy its own preview URL too. Accepting a comma-separated list
// here means the same Render backend can serve production and preview
// deploys (and local dev) without redeploying every time a preview URL
// changes.
//
//   CLIENT_URL=https://shirtcraft-dob.vercel.app,https://shirtcraft-git-preview.vercel.app

// The project's known production frontend, included unconditionally —
// not gated behind NODE_ENV === 'production' like before. There's no
// security downside to always allowing your own frontend's origin, and
// gating it meant a misconfigured/missing NODE_ENV on the host could
// turn into a CORS failure with no obvious cause.
//
// Vercel preview URLs do NOT look like "shirtcraft-dob-<anything>" — that
// was a guess and it was wrong. Vercel's actual format is
// "<project>-<hash-or-branch>-<team-slug>.vercel.app", e.g. the real one
// seen in production logs:
//   https://shirtcraft-h5l96sey6-david-orendu-benjamins-projects.vercel.app
// So the wildcard has to have the team slug on the END, not "shirtcraft-dob"
// on the start. Scoping it to that exact team slug (rather than a bare
// "shirtcraft-*.vercel.app") means it only matches deploys under this
// account, not any Vercel project anyone else might name similarly.
const KNOWN_ORIGINS = [
  'https://shirtcraft-dob.vercel.app', // production (custom Vercel alias)
  'https://shirtcraft-*-david-orendu-benjamins-projects.vercel.app', // this account's preview deploys
];

// Turns a wildcard pattern into a RegExp, escaping regex metacharacters
// first. The previous version only replaced "*" and left the literal
// dots in ".vercel.app" unescaped, so they'd match "any character"
// instead of a literal dot — harmless in practice here, but wrong.
function wildcardToRegExp(pattern) {
  const escaped = pattern
    .split('*')
    .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}$`);
}

function getAllowedOrigins() {
  const raw = process.env.CLIENT_URL || 'http://localhost:5173';

  // Split by comma, trim, and drop any trailing slash — a browser's
  // Origin header never has one, so "https://foo.vercel.app/" pasted
  // into CLIENT_URL would otherwise never match anything and fail
  // silently (no error, just a CORS block with no obvious cause).
  const configured = raw
    .split(',')
    .map(s => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  // De-duplicate in case CLIENT_URL already includes a known origin.
  return [...new Set([...configured, ...KNOWN_ORIGINS])];
}

// A cors()-compatible origin function: reflects the request's origin back
// only if it's in the allow-list, otherwise blocks it. Requests with no
// Origin header (server-to-server, curl, mobile apps) are allowed through.
function corsOriginCheck(origin, callback) {
  if (!origin) return callback(null, true);

  const allowed = getAllowedOrigins();
  const isAllowed = allowed.some(allowedOrigin =>
    allowedOrigin.includes('*')
      ? wildcardToRegExp(allowedOrigin).test(origin)
      : allowedOrigin === origin
  );

  if (isAllowed) return callback(null, true);

  console.warn(`🚫 CORS blocked origin: ${origin} — allowed: ${allowed.join(', ')}`);
  callback(new Error(`CORS: origin ${origin} is not allowed`));
}

// Resolves ONE canonical frontend URL, for when the server needs to send a
// browser somewhere (e.g. the Google OAuth redirect after login) — a
// different job from getAllowedOrigins(), which is an unordered allow-list
// for checking incoming request origins. The Google OAuth callback used to
// reuse getAllowedOrigins()[0] for this, but that array puts whatever's in
// CLIENT_URL first and the known production URL after — so if CLIENT_URL
// isn't set on the host at all, element [0] silently fell back to
// 'http://localhost:5173', and a real user signing in with Google in
// production would get redirected to a dead localhost URL right after
// approving access. This resolves the same way getAllowedOrigins() parses
// CLIENT_URL (first entry, trimmed, trailing slash stripped) but falls back
// to the real production URL instead of localhost.
function getPrimaryFrontendUrl() {
  const first = (process.env.CLIENT_URL || '').split(',')[0].trim().replace(/\/+$/, '');
  return first || 'https://shirtcraft-dob.vercel.app';
}

module.exports = { getAllowedOrigins, corsOriginCheck, getPrimaryFrontendUrl };





// // server/utils/corsOrigins.js
// //
// // CLIENT_URL is usually just the production frontend URL, but Vercel gives
// // every deploy its own preview URL too. Accepting a comma-separated list
// // here means the same Render backend can serve production and preview
// // deploys (and local dev) without redeploying every time a preview URL
// // changes.
// //
// //   CLIENT_URL=https://shirtcraft-dob.vercel.app,https://shirtcraft-git-preview.vercel.app

// // The project's known production frontend, included unconditionally —
// // not gated behind NODE_ENV === 'production' like before. There's no
// // security downside to always allowing your own frontend's origin, and
// // gating it meant a misconfigured/missing NODE_ENV on the host could
// // turn into a CORS failure with no obvious cause.
// //
// // Vercel preview URLs do NOT look like "shirtcraft-dob-<anything>" — that
// // was a guess and it was wrong. Vercel's actual format is
// // "<project>-<hash-or-branch>-<team-slug>.vercel.app", e.g. the real one
// // seen in production logs:
// //   https://shirtcraft-h5l96sey6-david-orendu-benjamins-projects.vercel.app
// // So the wildcard has to have the team slug on the END, not "shirtcraft-dob"
// // on the start. Scoping it to that exact team slug (rather than a bare
// // "shirtcraft-*.vercel.app") means it only matches deploys under this
// // account, not any Vercel project anyone else might name similarly.
// const KNOWN_ORIGINS = [
//   'https://shirtcraft-dob.vercel.app', // production (custom Vercel alias)
//   'https://shirtcraft-*-david-orendu-benjamins-projects.vercel.app', // this account's preview deploys
// ];

// // Turns a wildcard pattern into a RegExp, escaping regex metacharacters
// // first. The previous version only replaced "*" and left the literal
// // dots in ".vercel.app" unescaped, so they'd match "any character"
// // instead of a literal dot — harmless in practice here, but wrong.
// function wildcardToRegExp(pattern) {
//   const escaped = pattern
//     .split('*')
//     .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
//     .join('.*');
//   return new RegExp(`^${escaped}$`);
// }

// function getAllowedOrigins() {
//   const raw = process.env.CLIENT_URL || 'http://localhost:5173';

//   // Split by comma, trim, and drop any trailing slash — a browser's
//   // Origin header never has one, so "https://foo.vercel.app/" pasted
//   // into CLIENT_URL would otherwise never match anything and fail
//   // silently (no error, just a CORS block with no obvious cause).
//   const configured = raw
//     .split(',')
//     .map(s => s.trim().replace(/\/+$/, ''))
//     .filter(Boolean);

//   // De-duplicate in case CLIENT_URL already includes a known origin.
//   return [...new Set([...configured, ...KNOWN_ORIGINS])];
// }

// // A cors()-compatible origin function: reflects the request's origin back
// // only if it's in the allow-list, otherwise blocks it. Requests with no
// // Origin header (server-to-server, curl, mobile apps) are allowed through.
// function corsOriginCheck(origin, callback) {
//   if (!origin) return callback(null, true);

//   const allowed = getAllowedOrigins();
//   const isAllowed = allowed.some(allowedOrigin =>
//     allowedOrigin.includes('*')
//       ? wildcardToRegExp(allowedOrigin).test(origin)
//       : allowedOrigin === origin
//   );

//   if (isAllowed) return callback(null, true);

//   console.warn(`🚫 CORS blocked origin: ${origin} — allowed: ${allowed.join(', ')}`);
//   callback(new Error(`CORS: origin ${origin} is not allowed`));
// }

// module.exports = { getAllowedOrigins, corsOriginCheck };
