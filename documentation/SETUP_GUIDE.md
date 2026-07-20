# ShirtCraft v2 — Complete Setup Guide

This guide takes you from zero to a **fully live production system** with:
- Real MongoDB database (no mock data)
- Secure JWT authentication
- Cloudinary image uploads
- Stripe payment processing
- Nodemailer email delivery
- Dark mode toggle
- Full Admin panel (including admin creation)
- react-konva design studio

---

## Prerequisites

| Tool         | Version | Download                                 |
|--------------|---------|------------------------------------------|
| Node.js      | ≥ 18.0  | https://nodejs.org/en/download           |
| npm          | ≥ 9.0   | Included with Node.js                    |
| MongoDB      | ≥ 6.0   | https://www.mongodb.com/try/download/community |
| Git          | Any     | https://git-scm.com/downloads            |

Verify installations:
```bash
node --version    # Should output v18.x or higher
npm --version     # Should output 9.x or higher
mongod --version  # Should output v6.x or higher
```

---

## Step 1: Unzip and enter the project

```bash
unzip ShirtCraft.zip
cd shirtcraft
```

---

## Step 2: Install all dependencies

```bash
npm run install:all
# This runs npm install in both /client and /server
```

If you prefer to do it manually:
```bash
cd client && npm install
cd ../server && npm install
```

---

## Step 3: Start MongoDB

**macOS (Homebrew):**
```bash
brew services start mongodb-community@7.0
```

**Ubuntu/Debian:**
```bash
sudo systemctl start mongod
sudo systemctl enable mongod   # auto-start on reboot
```

**Windows (Run as Administrator):**
```bash
net start MongoDB
```

**MongoDB Atlas (cloud — recommended for production):**
1. Go to https://cloud.mongodb.com and create a free account
2. Create a new cluster (free M0 tier)
3. Click **Connect** → **Connect your application**
4. Copy the connection string (it looks like `mongodb+srv://...`)
5. Use it as `MONGO_URI` in step 4

---

## Step 4: Configure environment variables

### Backend — `server/.env`
```bash
cp server/.env.example server/.env
```
Edit `server/.env`:

```env
# ── Database ──────────────────────────────────────────────────────
# Local MongoDB:
MONGO_URI=mongodb://localhost:27017/shirtcraft

# OR MongoDB Atlas:
# MONGO_URI=mongodb+srv://yourusername:yourpassword@cluster0.xxxxx.mongodb.net/shirtcraft

# ── Application ───────────────────────────────────────────────────
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# ── Security ──────────────────────────────────────────────────────
# Generate a strong secret: openssl rand -base64 64
JWT_SECRET=replace_this_with_a_long_random_secret_string_minimum_32_chars
JWT_EXPIRES_IN=7d

# ── Email — Gmail (easiest for development) ───────────────────────
# 1. Enable 2-Factor Authentication on your Google account
# 2. Go to: myaccount.google.com → Security → App Passwords
# 3. Create an App Password for "Mail" → "Other (ShirtCraft)"
# 4. Use the 16-char generated password below (not your real Gmail password)
GMAIL_USER=your.gmail@gmail.com
GMAIL_PASS=xxxx_xxxx_xxxx_xxxx

# OR use a professional SMTP service like SendGrid (free tier: 100 emails/day):
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_USER=apikey
# SMTP_PASS=SG.your_sendgrid_api_key

EMAIL_FROM="ShirtCraft" <no-reply@shirtcraft.com>

# ── Cloudinary (image uploads) ────────────────────────────────────
# 1. Sign up at https://cloudinary.com (free tier: 25GB storage, 25GB bandwidth/month)
# 2. Go to your Cloudinary Dashboard
# 3. Copy the Cloud name, API Key, and API Secret shown on the dashboard
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_api_secret_here

# ── Stripe (payments) ─────────────────────────────────────────────
# 1. Sign up at https://stripe.com
# 2. Go to Developers → API Keys
# 3. Copy the Secret key (starts with sk_test_ for test mode)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
```

### Frontend — `client/.env`
```bash
cp client/.env.example client/.env
```
Edit `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
# Copy the Publishable key from Stripe dashboard (starts with pk_test_)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Step 5: Seed the database

This creates sample products, categories, coupons, and an admin account:

```bash
cd server
node utils/seed.js
```

Expected output:
```
✅ MongoDB connected
🗑️  Cleared existing data
👤 Created users: admin@shirtcraft.com, adaobi@example.com
📦 Created 6 products
🏷️  Created 3 coupons
📋 Created sample order
✨ Seed complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Admin login:    admin@shirtcraft.com / Admin1234!
Customer login: adaobi@example.com  / Customer123!
Coupons:        SHIRT10, CRAFT20, BULK30
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 6: Run in development

**Option A — Both servers at once (recommended):**
```bash
# From the root shirtcraft/ directory
npm run dev
```

**Option B — Separate terminals:**

Terminal 1 (backend):
```bash
cd server
npm run dev     # Uses nodemon for auto-reload on file changes
```

Terminal 2 (frontend):
```bash
cd client
npm run dev     # Vite dev server with HMR
```

Open your browser: **http://localhost:5173**

---

## Step 7: Verify everything works

1. **Home page** — products loaded from MongoDB should appear in "Bestselling Blanks"
2. **Registration** — create a new account, check your email for the welcome message
3. **Login** — use `admin@shirtcraft.com` / `Admin1234!` for admin access
4. **Design Studio** — open the studio, add text, change shirt colours, add to cart
5. **Admin Panel** — go to http://localhost:5173/admin
   - Dashboard shows revenue/order charts
   - Products page shows database products (add/edit/delete works)
   - Users & Admins page lets you promote customers to admin

---

## Step 8: Add products via Admin Panel

Since the database starts with seed data, add your real products through the Admin Panel:

1. Log in as admin
2. Go to **Admin → Products**
3. Click **Add Product**
4. Upload images (goes to Cloudinary), fill details, save

---

## Admin: Creating Additional Admin Accounts

1. Log in as an existing admin
2. Go to **Admin Panel → Users & Admins**
3. Click **Create Admin Account**
4. Fill name, email, and a temporary password
5. The new admin can log in immediately and change their password via Profile

To promote an existing customer to admin:
1. Find them in the Users table
2. Click **Make Admin** (Shield icon)
3. They now have full admin access

---

## Dark Mode

Dark mode is automatic based on the visitor's system preference. Users can toggle it manually via the **sun/moon switch** in the top-right of the navigation bar. The preference is saved to `localStorage` and persists across sessions.

---

## Coupon Codes (from seed)

| Code     | Discount | Minimum Order | Notes           |
|----------|----------|---------------|-----------------|
| SHIRT10  | 10%      | None          | 500 use limit   |
| CRAFT20  | 20%      | ₦5,000        | 200 use limit   |
| BULK30   | 30%      | ₦20,000       | Bulk orders      |

Create new codes in **Admin → Coupons**.

---

## Production Deployment

### Deploy frontend to Vercel
```bash
cd client
npm run build               # Creates client/dist/
npx vercel --prod           # Follow the prompts
```
In Vercel dashboard, add environment variables from `client/.env`.

### Deploy backend to Render
1. Create a new **Web Service** on https://render.com
2. Connect your GitHub repo
3. Set **Root Directory** to `server`
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `node index.js`
6. Add all `server/.env` values as Environment Variables

### Recommended production stack
| Service     | What              | Free Tier                    |
|-------------|-------------------|------------------------------|
| Vercel      | Frontend hosting  | Unlimited static sites       |
| Render      | Backend API       | 750 free hours/month         |
| MongoDB Atlas| Database         | 512MB M0 cluster forever     |
| Cloudinary  | Image storage     | 25GB storage + 25GB bandwidth|
| Sendgrid    | Email delivery    | 100 emails/day               |
| Stripe      | Payments          | No monthly fee, 2.9% + ₦30  |

---

## Troubleshooting

**"MongooseServerSelectionError" on startup**
→ MongoDB is not running. Run `brew services start mongodb-community` (macOS) or `sudo systemctl start mongod` (Linux).

**"Invalid token" after login**
→ `JWT_SECRET` in `.env` is missing or empty. Set a long random string.

**Images not uploading**
→ Check `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `server/.env`. All three must be present.

**Emails not sending**
→ For Gmail, ensure you are using an **App Password** (not your real password) and 2FA is enabled. Alternatively, leave email env vars empty — the app works fine without email (orders still save to DB; no confirmation emails sent).

**"Network Error" on API calls**
→ Ensure the backend is running on port 5000 and `VITE_API_URL=http://localhost:5000/api` in `client/.env`.

**Stripe payment fails**
→ Use test card `4242 4242 4242 4242`, expiry any future date, CVV any 3 digits. `STRIPE_SECRET_KEY` must be the `sk_test_` key, not live key.

**Port already in use**
→ Change `PORT=5001` in `server/.env` and `VITE_API_URL=http://localhost:5001/api` in `client/.env`.

---

## Google OAuth Setup

1. Go to https://console.cloud.google.com
2. Create a project → **APIs & Services** → **Credentials**
3. Click **Create Credentials** → **OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Add **Authorised JavaScript origins**: `http://localhost:5173`
6. Add **Authorised redirect URIs**: `http://localhost:5000/api/auth/google/callback`
7. Copy the **Client ID** and **Client Secret**
8. Add to `server/.env`:
   ```
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
   SESSION_SECRET=any_long_random_string
   ```

For production, update the redirect URI to your live domain.

---

## Driver System Setup

### How drivers join:
1. Driver visits `/driver/register` and submits their application
2. Admin receives an email notification
3. Admin goes to **Admin Panel → Drivers & Map**
4. Finds the driver, clicks **View**, sets status to **Active**, clicks **Save**
5. Driver receives an approval email
6. Driver logs in at `/driver/login` (email + phone number)
7. Driver opens their dashboard, toggles **Go Online**
8. GPS tracking begins — their dot appears on the admin live map

### How to assign a delivery:
1. Go to **Admin → Orders**, find a processing order
2. Go to **Admin → Drivers & Map**, find an online driver
3. Click **View** on the driver → **Assign Delivery Order**
4. Select the order from the dropdown → **Assign Order**
5. Customer receives an email with a live tracking link
6. Customer opens `/track/{orderId}` to watch the driver in real time

### Driver dashboard features:
- Real-time GPS dot on dark Leaflet map
- Toggle online/offline button
- Current delivery card with customer address
- **Picked Up** and **Delivered** action buttons
- Automatically emits location every 2 seconds via Socket.io
- Total deliveries counter + star rating

### Live map (Admin view):
- Dark Carto tile map centred on Lagos
- All online drivers shown as coloured emoji markers (🏍️ 🚗 🚐 🚚)
- Green = online and active, grey = offline
- Markers update in real time via Socket.io
- Click any marker for name, plate, speed, and active order
- Switch between **Table** (manage) and **Live Map** (monitor) tabs

---

## Demo Accounts (after seed)

| Role     | Login                              | Password / Auth         |
|----------|------------------------------------|-------------------------|
| Admin    | admin@shirtcraft.com               | Admin1234!              |
| Customer | adaobi@example.com                 | Customer123!            |
| Driver   | emeka.driver@shirtcraft.com (email)| +2348012345678 (phone)  |

Coupon codes: **SHIRT10** · **CRAFT20** · **BULK30**

---

## Route Reference

| URL                    | Description                              |
|------------------------|------------------------------------------|
| `/`                    | Home page                                |
| `/catalog`             | Product catalogue with filters           |
| `/products/:id`        | Product detail + reviews                 |
| `/design-studio`       | react-konva shirt design editor          |
| `/cart`                | Shopping cart                            |
| `/checkout`            | 3-step checkout (protected)              |
| `/track/:orderId`      | Customer live delivery tracking          |
| `/login`               | Email/password + Google OAuth login      |
| `/register`            | Registration + Google OAuth              |
| `/auth/callback`       | Google OAuth redirect handler            |
| `/dashboard`           | Customer orders, wishlist, profile       |
| `/driver/register`     | Public driver application form           |
| `/driver/login`        | Driver login (email + phone)             |
| `/driver/dashboard`    | Bolt/Uber-style driver app               |
| `/admin`               | Admin analytics dashboard                |
| `/admin/products`      | Product CRUD with image upload           |
| `/admin/orders`        | Order management + tracking assignment   |
| `/admin/drivers`       | Driver management + live GPS map         |
| `/admin/users`         | User management + admin creation         |
| `/admin/customers`     | Customer list + CSV export               |
| `/admin/coupons`       | Coupon CRUD                              |
