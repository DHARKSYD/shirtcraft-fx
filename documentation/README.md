# ShirtCraft — Custom T-Shirt Design & E-Commerce Platform

![ShirtCraft](https://img.shields.io/badge/ShirtCraft-v1.0.0-FF4F1F?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?style=flat-square&logo=mongodb)

ShirtCraft is a **full-stack custom t-shirt e-commerce platform** that allows customers to browse premium blank t-shirts, customise them using a professional design studio, and place orders with integrated payment processing.

---

## ✨ Features

### Customer-Facing
- 🎨 **Professional Design Studio** — Fabric.js-powered editor with text, image upload, layer management, undo/redo
- 🛒 **E-Commerce** — Product catalog, cart, wishlist, coupon codes, multi-step checkout
- 💳 **Payments** — Stripe & PayPal integration with order confirmation emails
- 📦 **Order Tracking** — Real-time status updates with tracking numbers
- 👤 **Customer Dashboard** — Orders, wishlist, profile, address management

### Admin Panel
- 📊 **Analytics** — Revenue charts, order stats, customer metrics (Recharts)
- 🗂️ **Product Management** — Full CRUD with image uploads via Cloudinary
- 📋 **Order Management** — Status updates, tracking, invoice generation
- 👥 **Customer Management** — View, filter, export customer data
- 🏷️ **Coupon System** — Create percentage/fixed discounts with usage limits and expiry dates

### Technical
- 🔐 **JWT Authentication** — Secure login with role-based access (customer / admin)
- 📧 **Email Notifications** — Nodemailer for registration, order, and shipping emails
- ☁️ **Cloudinary** — Cloud image storage for product images and design uploads
- 📱 **Fully Responsive** — Mobile-first design, works from 320px to 4K

---

## 🧱 Technology Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 18 + Vite, Redux Toolkit, React Router v6 |
| Styling    | CSS Modules (custom design system, no framework)|
| Animations | Framer Motion                                   |
| Editor     | Fabric.js                                       |
| Charts     | Recharts                                        |
| HTTP       | Axios with JWT interceptors                     |
| Backend    | Node.js + Express.js                            |
| Database   | MongoDB + Mongoose                              |
| Auth       | JSON Web Tokens (JWT) + bcryptjs                |
| Payments   | Stripe, PayPal                                  |
| Email      | Nodemailer (Gmail / SMTP / Ethereal)            |
| Storage    | Cloudinary                                      |
| Validation | express-validator                               |

---

## 📁 Folder Structure

```
shirtcraft/
├── client/                     # React frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── Layout/         # Navbar, Footer
│   │   │   ├── UI/             # Toast, ProtectedRoute
│   │   │   ├── Product/        # ProductCard
│   │   │   └── Cart/           # CartDrawer, CartItem
│   │   ├── pages/              # Route-level page components
│   │   │   ├── Auth/           # Login, Register, ForgotPassword
│   │   │   ├── Dashboard/      # Customer Dashboard, Orders, Wishlist, Profile
│   │   │   └── Admin/          # AdminLayout, Dashboard, Products, Orders, Customers, Coupons
│   │   ├── store/              # Redux Toolkit store
│   │   │   └── slices/         # authSlice, cartSlice, wishlistSlice, productSlice, orderSlice, uiSlice
│   │   ├── utils/              # api.js (Axios), mockData.js
│   │   └── styles/             # global.css (design system tokens)
│   ├── index.html
│   └── vite.config.js
│
├── server/                     # Node.js / Express backend
│   ├── controllers/            # Business logic (auth, products, orders)
│   ├── models/                 # Mongoose schemas (User, Product, Order, Coupon)
│   ├── routes/                 # Express routers
│   ├── middleware/             # auth.js (protect, adminOnly, generateToken)
│   ├── utils/                  # email.js (Nodemailer)
│   └── index.js                # Express app entry point
│
└── documentation/              # This folder
    ├── README.md
    ├── API.md
    ├── DATABASE.md
    ├── COMPONENTS.md
    ├── DEVELOPER_GUIDE.md
    └── PRESENTATION_GUIDE.md
```

---

## ⚡ Quick Start

### Prerequisites

| Tool    | Version  | Install                             |
|---------|----------|-------------------------------------|
| Node.js | ≥ 18.0   | https://nodejs.org                  |
| npm     | ≥ 9.0    | Comes with Node.js                  |
| MongoDB | ≥ 6.0    | https://www.mongodb.com/try/download|
| Git     | any      | https://git-scm.com                 |

### 1 — Clone the repository

```bash
git clone https://github.com/yourusername/shirtcraft.git
cd shirtcraft
```

### 2 — Set up the backend

```bash
cd server
cp .env.example .env       # Copy environment template
nano .env                  # Fill in your values (see Environment Variables below)
npm install
```

### 3 — Set up the frontend

```bash
cd ../client
cp .env.example .env
# Edit VITE_API_URL if your server runs on a different port
npm install
```

### 4 — Start MongoDB

```bash
# macOS/Linux with Homebrew:
brew services start mongodb-community

# Ubuntu/Debian:
sudo systemctl start mongod

# Windows (run as admin):
net start MongoDB
```

### 5 — Run the development servers

**Backend** (Terminal 1):
```bash
cd server
npm run dev         # Uses nodemon for hot-reload
```

**Frontend** (Terminal 2):
```bash
cd client
npm run dev         # Starts Vite dev server on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## 🔑 Environment Variables

### server/.env

| Variable               | Required | Description                               |
|------------------------|----------|-------------------------------------------|
| `MONGO_URI`            | ✅       | MongoDB connection string                 |
| `PORT`                 | ✅       | Server port (default: 5000)               |
| `JWT_SECRET`           | ✅       | Secret key for signing JWTs (min 32 chars)|
| `CLIENT_URL`           | ✅       | Frontend URL for CORS                     |
| `GMAIL_USER`           | ⚠️       | Gmail address (or use SMTP_HOST)          |
| `GMAIL_PASS`           | ⚠️       | Gmail app password                        |
| `CLOUDINARY_CLOUD_NAME`| ⚠️       | Cloudinary cloud name                     |
| `CLOUDINARY_API_KEY`   | ⚠️       | Cloudinary API key                        |
| `CLOUDINARY_API_SECRET`| ⚠️       | Cloudinary API secret                     |
| `STRIPE_SECRET_KEY`    | ⚠️       | Stripe secret key (sk_test_...)           |

> ⚠️ Optional for demo mode — app works without these, using mock responses.

### client/.env

| Variable                     | Description                    |
|------------------------------|--------------------------------|
| `VITE_API_URL`               | Backend API base URL           |
| `VITE_STRIPE_PUBLISHABLE_KEY`| Stripe publishable key         |

---

## 🏗️ Build for Production

### Frontend
```bash
cd client
npm run build          # Outputs to client/dist/
```

### Backend
```bash
cd server
npm start              # NODE_ENV=production node index.js
```

### Deploy with PM2 (recommended)
```bash
npm install -g pm2
pm2 start server/index.js --name shirtcraft-api
pm2 save
pm2 startup
```

---

## 🌐 Deployment

| Service     | What to deploy  | Notes                                      |
|-------------|-----------------|---------------------------------------------|
| **Vercel**  | `client/dist`   | Add env vars in project settings           |
| **Render**  | `server/`       | Set `NODE_ENV=production`, connect MongoDB |
| **Railway** | Full stack      | One-click deploy with Dockerfile           |
| **MongoDB Atlas** | Database  | Free M0 cluster for development            |

---

## 👤 Demo Credentials

> The app runs in **demo mode** — no real database required.

| Role     | Email                       | Password  |
|----------|-----------------------------|-----------|
| Customer | any@email.com               | any value |
| Admin    | admin@shirtcraft.com        | any value |

---

## 📜 License

MIT © 2025 ShirtCraft Nigeria. Built for academic presentation purposes.
