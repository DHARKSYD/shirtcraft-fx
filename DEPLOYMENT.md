# Deploying ShirtCraft

Two services, deployed independently from this one repository:

- **`client/`** → Vercel (static React/Vite build)
- **`server/`** → Render (Node/Express + Socket.io web service)

Both need to know about the other via environment variables — there's no
build-time linking between them.

---

## 1. Backend first — Render

1. New **Web Service** → connect this repo.
2. **Root Directory:** `server`
3. **Build Command:** `npm install`
4. **Start Command:** `npm start` (not `node index.js` directly — the
   `start` script in `server/package.json` also sets `NODE_ENV=production`)
5. **Environment variables** — copy every key from `server/.env.example`
   with real values. At minimum, before anything will work:

   | Variable | Notes |
   |---|---|
   | `MONGO_URI` | A MongoDB Atlas connection string (see §3) |
   | `JWT_SECRET`, `SESSION_SECRET` | Any long random strings |
   | `CLIENT_URL` | Your Vercel URL — see §4, set *after* the frontend is deployed |
   | `CLOUDINARY_*` | From your Cloudinary dashboard |
   | `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET` | From your Paystack dashboard — start with the `sk_test_...` key |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Only needed if Google sign-in is enabled |
   | `GMAIL_USER`, `GMAIL_PASS` | A Gmail **App Password**, not your normal password |
   | `ORDER_PAYMENT_TIMEOUT_HOURS` | Optional — defaults to 48. Hours an unpaid order is held before it's auto-cancelled and released. |

6. Deploy. Note the Render URL it gives you (e.g. `https://shirtcraft-api.onrender.com`) — the frontend needs it next.

Render's free tier spins down after inactivity, so the first request after
a quiet period can take 20–30 seconds to respond — this is expected, not a bug.

## 2. Frontend — Vercel

1. New Project → same repo.
2. **Root Directory:** `client`
3. **Build Command:** `npm run build` (default for Vite)
4. **Output Directory:** `dist` (default)
5. **Environment variables:**

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://<your-render-service>.onrender.com/api` |
   | `VITE_PAYSTACK_PUBLIC_KEY` | Your Paystack `pk_test_...` / `pk_live_...` key |

6. Deploy. `client/vercel.json` already includes the rewrite rule React
   Router needs so deep links (`/products/123`, `/driver/dashboard`, …)
   don't 404 on a direct load or page refresh.

## 3. Database — MongoDB Atlas

1. Create a free M0 cluster.
2. **Network Access** → allow `0.0.0.0/0` (or Render's specific outbound
   IPs, if you'd rather scope it down once things are working).
3. **Database Access** → create a user, then build `MONGO_URI` as:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/shirtcraft`

## 4. Wire the two together

Once both are deployed:

1. Copy the Vercel production URL into Render's `CLIENT_URL` and redeploy
   the backend (or just restart it — Render picks up env var changes on
   restart). `CLIENT_URL` accepts a comma-separated list, so you can
   include a Vercel preview URL alongside production:
   `CLIENT_URL=https://shirtcraft.vercel.app,https://shirtcraft-git-preview.vercel.app`
2. If Google sign-in is enabled, add the production callback URL
   (`https://<render-url>/api/auth/google/callback`) to the **Authorized
   redirect URIs** in the Google Cloud Console — a mismatch here is the
   most common cause of "it works locally but not in production."
3. Test end to end: register an account, place a test order with a
   Paystack test card, and confirm the order shows up in `/admin`.

## 5. Before accepting real payments

- Switch `PAYSTACK_SECRET_KEY` / `VITE_PAYSTACK_PUBLIC_KEY` from `_test_`
  to `_live_` keys.
- Payment confirmation doesn't use a Paystack webhook — Paystack redirects
  back to `/order-success/:orderId?reference=...` after checkout, and that
  page calls `POST /api/orders/verify-payment`, which checks the reference
  against Paystack's verify API server-side before marking the order paid.
  `PAYSTACK_WEBHOOK_SECRET` in `.env.example` is unused by the current code
  and can be left blank — the one gap this leaves is a customer who pays
  but closes the tab before the redirect completes; those orders stay
  'pending' until an admin manually marks them paid (or they get caught by
  the 48h auto-cancel sweep, so stock isn't held hostage indefinitely
  either way). A real webhook handler would close that gap if you add one
  later.
- Double-check `NODE_ENV=production` is set on Render — it tightens
  session cookie security (`secure: true`) and disables verbose error
  responses.

See `documentation/SETUP_GUIDE.md` for local development setup, and
`documentation/` generally for architecture and API reference.
