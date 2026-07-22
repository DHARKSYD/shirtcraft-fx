// server/index.js — with Google OAuth, Socket.io, Driver routes
require('dotenv').config();
const express      = require('express');
const http         = require('http');
const mongoose     = require('mongoose');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const session      = require('express-session');
const rateLimit    = require('express-rate-limit');
const cron         = require('node-cron');
const passportConf = require('./config/passport');
const { initSocket } = require('./config/socket');
const { ensureDefaultData } = require('./utils/seed');
const { corsOriginCheck, getAllowedOrigins, getPrimaryFrontendUrl } = require('./utils/corsOrigins');
const { autoCancelUnpaidOrders } = require('./utils/orderMaintenance');

// ── Fail fast on unsafe production config ──────────────────────────
// The JWT/session code falls back to a hardcoded string when these are
// unset — fine for a local `npm run dev`, but silently shipping that
// fallback to production would mean every token is forgeable by anyone
// who has read this (public) source file. Refuse to boot instead.
if (process.env.NODE_ENV === 'production') {
  const missing = ['JWT_SECRET', 'SESSION_SECRET'].filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`❌ Refusing to start in production without: ${missing.join(', ')}. Set these in your environment (see server/.env.example).`);
    process.exit(1);
  }
}

// ── Routes ───────────────────────────────────────────────────────
const authRoutes    = require('./routes/auth');
const userRoutes    = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes   = require('./routes/orders');
const uploadRoutes  = require('./routes/uploads');
const couponRoutes  = require('./routes/coupons');
const adminRoutes   = require('./routes/admin');
const driverRoutes  = require('./routes/drivers');

const app    = express();
const server = http.createServer(app); // HTTP server for Socket.io
const PORT   = Number(process.env.PORT || 5000);

// Render (and most PaaS hosts) sit behind a reverse proxy — without this,
// req.ip is always the proxy's own address, which breaks IP-based rate
// limiting below (everyone would share one bucket).
app.set('trust proxy', 1);

// ── Middleware ────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('combined'));
app.use(cors({
  origin:      corsOriginCheck,
  credentials: true,
}));
// `verify` stashes the raw request bytes on req.rawBody before JSON-parsing
// mutates them — the Paystack webhook needs the exact original bytes to
// check its HMAC signature; re-serializing the parsed object would produce
// a different byte sequence and always fail verification.
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true }));

// ── Path normalization ──────────────────────────────────────────
// Every real route in this app lives under /api/* — there's no other
// static or root route to collide with. If a client is ever pointed at
// this server without the /api prefix (e.g. VITE_API_URL misconfigured
// on Vercel), normalize it here rather than depending on that external
// value being exactly right. This runs before rate limiting and routing
// below, so a request for bare /auth/login is treated identically to
// /api/auth/login in every respect, including the login rate limiter —
// unlike the old bare-route mounts this replaces, nothing here can be
// used to bypass it.
app.use((req, _res, next) => {
  if (!req.url.startsWith('/api/')) req.url = '/api' + req.url;
  next();
});

// ── Rate limiting ────────────────────────────────────────────────
// Generous global ceiling against accidental hammering / scraping...
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down and try again shortly.' },
}));
// ...and a tighter one on auth/registration endpoints specifically, where
// the real risk is credential-stuffing or someone spraying fake driver
// applications to probe the new uniqueness checks on plate/licence/phone.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
});
app.use(['/api/auth/login', '/api/auth/register', '/api/drivers/login', '/api/drivers/register', '/api/uploads/driver-document'], authLimiter);

// API routes below are mounted under /api — the normalization middleware
// above means callers get an identical result whether or not they
// included that prefix themselves.

// Session (needed for Passport OAuth flow only)
app.use(session({
  secret:            process.env.SESSION_SECRET || 'shirtcraft_session_secret',
  resave:            false,
  saveUninitialized: false,
  cookie:            { secure: process.env.NODE_ENV === 'production', maxAge: 10 * 60 * 1000 },
}));
app.use(passportConf.initialize());
app.use(passportConf.session());

// ── Google OAuth Routes (must be before /api/auth) ───────────────
const passport = require('passport');

if (passport.googleEnabled) {
  // Redirect to Google
  app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: true })
  );

  // Google callback
  app.get('/api/auth/google/callback',
    passport.authenticate('google', { session: true, failureRedirect: `${getPrimaryFrontendUrl()}/login?error=google_failed` }),
    (req, res) => {
      // Send JWT back to frontend via URL param (handled by frontend callback page)
      const token = req.user._jwtToken;
      const name  = encodeURIComponent(req.user.name);
      const email = encodeURIComponent(req.user.email);
      const role  = req.user.role;
      res.redirect(
        `${getPrimaryFrontendUrl()}/auth/callback?token=${token}&name=${name}&email=${email}&role=${role}`
      );
    }
  );
} else {
  // Same paths, friendly response instead of a passport "unknown strategy"
  // error — keeps the frontend's Google button from dying with a raw 500.
  const googleDisabled = (req, res) => res.status(503).json({ message: 'Google sign-in is not configured on this server.' });
  app.get('/api/auth/google', googleDisabled);
  app.get('/api/auth/google/callback', googleDisabled);
}

// ── API Routes ────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/uploads',  uploadRoutes);
app.use('/api/coupons',  couponRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/drivers',  driverRoutes);

// ── Health ────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status:'ok', time: new Date().toISOString() }));

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Duplicate key (E11000) — thrown by any `unique: true` schema path
  // (Driver.phone/vehiclePlate/licenseNumber, User.email/phone, etc.).
  // Without this, a duplicate submission surfaces as an opaque 500; this
  // names the exact field so the frontend can point at it directly.
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    const label = field.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
    return res.status(409).json({
      message: `${label} "${err.keyValue?.[field]}" is already in use. Please use a different ${label.toLowerCase()}.`,
      field,
    });
  }

  // Mongoose schema validation errors — collapse to the first message
  // rather than dumping the whole nested error tree at the client.
  if (err.name === 'ValidationError') {
    const first = Object.values(err.errors)[0];
    return res.status(400).json({ message: first?.message || 'Validation failed.', field: first?.path });
  }

  // Malformed ObjectId in a route param (e.g. /api/orders/not-a-real-id)
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}.` });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── Connect DB, start server, init Socket.io ─────────────────────
const startServer = (port) => {
  const onError = (err) => {
    if (err.code === 'EADDRINUSE' && port < 5010) {
      const nextPort = port + 1;
      console.warn(`⚠️ Port ${port} is busy, trying ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    console.error('❌ Server failed to start:', err.message);
    process.exit(1);
  };

  server.once('error', onError);
  server.listen(port, () => {
    server.off('error', onError);
    console.log(`🚀 Server + Socket.io on http://localhost:${port}`);
  });
};

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shirtcraft')
  .then(async () => {
    console.log('✅ MongoDB connected');
    await ensureDefaultData();
    initSocket(server); // Attach Socket.io to HTTP server
    startServer(PORT);

    // Sweep for orders that have sat unpaid past the payment deadline
    // (default 48h, ORDER_PAYMENT_TIMEOUT_HOURS overrides it) once on boot
    // — so a server that was asleep (Render free tier) or restarted still
    // catches anything that piled up — then every hour after.
    autoCancelUnpaidOrders().catch(err => console.error('Order auto-cancel sweep failed:', err));
    cron.schedule('0 * * * *', () => {
      autoCancelUnpaidOrders().catch(err => console.error('Order auto-cancel sweep failed:', err));
    });
  })
  .catch(err => { console.error('❌ MongoDB failed:', err.message); process.exit(1); });

module.exports = app;




// // server/index.js — with Google OAuth, Socket.io, Driver routes
// require('dotenv').config();
// const express      = require('express');
// const http         = require('http');
// const mongoose     = require('mongoose');
// const cors         = require('cors');
// const helmet       = require('helmet');
// const morgan       = require('morgan');
// const session      = require('express-session');
// const rateLimit    = require('express-rate-limit');
// const cron         = require('node-cron');
// const passportConf = require('./config/passport');
// const { initSocket } = require('./config/socket');
// const { ensureDefaultData } = require('./utils/seed');
// const { corsOriginCheck, getAllowedOrigins } = require('./utils/corsOrigins');
// const { autoCancelUnpaidOrders } = require('./utils/orderMaintenance');

// // ── Fail fast on unsafe production config ──────────────────────────
// // The JWT/session code falls back to a hardcoded string when these are
// // unset — fine for a local `npm run dev`, but silently shipping that
// // fallback to production would mean every token is forgeable by anyone
// // who has read this (public) source file. Refuse to boot instead.
// if (process.env.NODE_ENV === 'production') {
//   const missing = ['JWT_SECRET', 'SESSION_SECRET'].filter(k => !process.env[k]);
//   if (missing.length) {
//     console.error(`❌ Refusing to start in production without: ${missing.join(', ')}. Set these in your environment (see server/.env.example).`);
//     process.exit(1);
//   }
// }

// // ── Routes ───────────────────────────────────────────────────────
// const authRoutes    = require('./routes/auth');
// const userRoutes    = require('./routes/users');
// const productRoutes = require('./routes/products');
// const orderRoutes   = require('./routes/orders');
// const uploadRoutes  = require('./routes/uploads');
// const couponRoutes  = require('./routes/coupons');
// const adminRoutes   = require('./routes/admin');
// const driverRoutes  = require('./routes/drivers');

// const app    = express();
// const server = http.createServer(app); // HTTP server for Socket.io
// const PORT   = Number(process.env.PORT || 5000);

// // Render (and most PaaS hosts) sit behind a reverse proxy — without this,
// // req.ip is always the proxy's own address, which breaks IP-based rate
// // limiting below (everyone would share one bucket).
// app.set('trust proxy', 1);

// // ── Middleware ────────────────────────────────────────────────────
// app.use(helmet({ contentSecurityPolicy: false }));
// app.use(morgan('combined'));
// app.use(cors({
//   origin:      corsOriginCheck,
//   credentials: true,
// }));
// // `verify` stashes the raw request bytes on req.rawBody before JSON-parsing
// // mutates them — the Paystack webhook needs the exact original bytes to
// // check its HMAC signature; re-serializing the parsed object would produce
// // a different byte sequence and always fail verification.
// app.use(express.json({
//   limit: '10mb',
//   verify: (req, _res, buf) => { req.rawBody = buf; },
// }));
// app.use(express.urlencoded({ extended: true }));

// // ── Path normalization ───
// // der /api/* — there's no other
// // static or root route to collide with. If a client is ever pointed at
// // this server without the /api prefix (e.g. VITE_API_URL misconfigured
// // on Vercel), normalize it here rather than depending on that external
// // value being exactly right. This runs before rate limiting and routing
// // below, so a request for bare /auth/login is treated identically to
// // /api/auth/login in every respect, including the login rate limiter —
// // unlike the old bare-route mounts this replaces, nothing here can be
// // used to bypass it.
// app.use((req, _res, next) => {
//   if (!req.url.startsWith('/api/')) req.url = '/api' + req.url;
//   next();
// });

// // ── Rate limiting ────────────────────────────────────────────────
// // Generous global ceiling against accidental hammering / scraping...
// app.use('/api', rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 500,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: { message: 'Too many requests. Please slow down and try again shortly.' },
// }));
// // ...and a tighter one on auth/registration endpoints specifically, where
// // the real risk is credential-stuffing or someone spraying fake driver
// // applications to probe the new uniqueness checks on plate/licence/phone.
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 20,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
// });
// app.use(['/api/auth/login', '/api/auth/register', '/api/drivers/login', '/api/drivers/register', '/api/uploads/driver-document'], authLimiter);

// // API routes below are mounted under /api — the normalization middleware
// // above means callers get an identical result whether or not they
// // included that prefix themselves.

// // Session (needed for Passport OAuth flow only)
// app.use(session({
//   secret:            process.env.SESSION_SECRET || 'shirtcraft_session_secret',
//   resave:            false,
//   saveUninitialized: false,
//   cookie:            { secure: process.env.NODE_ENV === 'production', maxAge: 10 * 60 * 1000 },
// }));
// app.use(passportConf.initialize());
// app.use(passportConf.session());

// // ── Google OAuth Routes (must be before /api/auth) ───────────────
// const passport = require('passport');

// if (passport.googleEnabled) {
//   // Redirect to Google
//   app.get('/api/auth/google',
//     passport.authenticate('google', { scope: ['profile', 'email'], session: true })
//   );

//   // Google callback
//   app.get('/api/auth/google/callback',
//     passport.authenticate('google', { session: true, failureRedirect: `${getAllowedOrigins()[0]}/login?error=google_failed` }),
//     (req, res) => {
//       // Send JWT back to frontend via URL param (handled by frontend callback page)
//       const token = req.user._jwtToken;
//       const name  = encodeURIComponent(req.user.name);
//       const email = encodeURIComponent(req.user.email);
//       const role  = req.user.role;
//       res.redirect(
//         `${getAllowedOrigins()[0]}/auth/callback?token=${token}&name=${name}&email=${email}&role=${role}`
//       );
//     }
//   );
// } else {
//   // Same paths, friendly response instead of a passport "unknown strategy"
//   // error — keeps the frontend's Google button from dying with a raw 500.
//   const googleDisabled = (req, res) => res.status(503).json({ message: 'Google sign-in is not configured on this server.' });
//   app.get('/api/auth/google', googleDisabled);
//   app.get('/api/auth/google/callback', googleDisabled);
// }

// // ── API Routes ────────────────────────────────────────────────────
// app.use('/api/auth',     authRoutes);
// app.use('/api/users',    userRoutes);
// app.use('/api/products', productRoutes);
// app.use('/api/orders',   orderRoutes);
// app.use('/api/uploads',  uploadRoutes);
// app.use('/api/coupons',  couponRoutes);
// app.use('/api/admin',    adminRoutes);
// app.use('/api/drivers',  driverRoutes);

// // ── Health ────────────────────────────────────────────────────────
// app.get('/api/health', (_, res) => res.json({ status:'ok', time: new Date().toISOString() }));

// // ── Global error handler ──────────────────────────────────────────
// app.use((err, req, res, next) => {
//   console.error(err.stack);

//   // Duplicate key (E11000) — thrown by any `unique: true` schema path
//   // (Driver.phone/vehiclePlate/licenseNumber, User.email/phone, etc.).
//   // Without this, a duplicate submission surfaces as an opaque 500; this
//   // names the exact field so the frontend can point at it directly.
//   if (err.code === 11000) {
//     const field = Object.keys(err.keyValue || {})[0] || 'value';
//     const label = field.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
//     return res.status(409).json({
//       message: `${label} "${err.keyValue?.[field]}" is already in use. Please use a different ${label.toLowerCase()}.`,
//       field,
//     });
//   }

//   // Mongoose schema validation errors — collapse to the first message
//   // rather than dumping the whole nested error tree at the client.
//   if (err.name === 'ValidationError') {
//     const first = Object.values(err.errors)[0];
//     return res.status(400).json({ message: first?.message || 'Validation failed.', field: first?.path });
//   }

//   // Malformed ObjectId in a route param (e.g. /api/orders/not-a-real-id)
//   if (err.name === 'CastError') {
//     return res.status(400).json({ message: `Invalid ${err.path}.` });
//   }

//   res.status(err.status || 500).json({
//     message: err.message || 'Internal server error',
//     ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
//   });
// });

// // ── Connect DB, start server, init Socket.io ─────────────────────
// const startServer = (port) => {
//   const onError = (err) => {
//     if (err.code === 'EADDRINUSE' && port < 5010) {
//       const nextPort = port + 1;
//       console.warn(`⚠️ Port ${port} is busy, trying ${nextPort}...`);
//       startServer(nextPort);
//       return;
//     }

//     console.error('❌ Server failed to start:', err.message);
//     process.exit(1);
//   };

//   server.once('error', onError);
//   server.listen(port, () => {
//     server.off('error', onError);
//     console.log(`🚀 Server + Socket.io on http://localhost:${port}`);
//   });
// };

// mongoose
//   .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shirtcraft')
//   .then(async () => {
//     console.log('✅ MongoDB connected');
//     await ensureDefaultData();
//     initSocket(server); // Attach Socket.io to HTTP server
//     startServer(PORT);

//     // Sweep for orders that have sat unpaid past the payment deadline
//     // (default 48h, ORDER_PAYMENT_TIMEOUT_HOURS overrides it) once on boot
//     // — so a server that was asleep (Render free tier) or restarted still
//     // catches anything that piled up — then every hour after.
//     autoCancelUnpaidOrders().catch(err => console.error('Order auto-cancel sweep failed:', err));
//     cron.schedule('0 * * * *', () => {
//       autoCancelUnpaidOrders().catch(err => console.error('Order auto-cancel sweep failed:', err));
//     });
//   })
//   .catch(err => { console.error('❌ MongoDB failed:', err.message); process.exit(1); });

// module.exports = app;
