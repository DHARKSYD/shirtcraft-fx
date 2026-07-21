// server/utils/corsOrigins.js
function getAllowedOrigins() {
  const raw = process.env.CLIENT_URL || 'http://localhost:5173';
  
  // Split by comma and trim
  let origins = raw.split(',').map(s => s.trim()).filter(Boolean);
  
  // Add common Vercel patterns if in production
  if (process.env.NODE_ENV === 'production') {
    // This allows all Vercel preview deployments for your project
    origins.push('https://shirtcraft-dob.vercel.app');
    origins.push('https://shirtcraft-dob-*.vercel.app');
    // If your project name is different, adjust accordingly
  }
  
  console.log('🔒 CORS allowed origins:', origins);
  return origins;
}

function corsOriginCheck(origin, callback) {
  // Allow requests with no origin (like mobile apps, server-to-server)
  if (!origin) {
    return callback(null, true);
  }
  
  const allowed = getAllowedOrigins();
  
  // Check if origin matches any allowed pattern
  const isAllowed = allowed.some(allowedOrigin => {
    // Exact match
    if (allowedOrigin === origin) return true;
    
    // Wildcard match for Vercel preview URLs (e.g., https://shirtcraft-dob-*.vercel.app)
    if (allowedOrigin.includes('*')) {
      const pattern = new RegExp('^' + allowedOrigin.replace(/\*/g, '.*') + '$');
      return pattern.test(origin);
    }
    
    return false;
  });
  
  if (isAllowed) {
    return callback(null, true);
  }
  
  console.warn(`🚫 CORS blocked origin: ${origin}`);
  callback(new Error(`CORS: origin ${origin} is not allowed`));
}

module.exports = { getAllowedOrigins, corsOriginCheck };