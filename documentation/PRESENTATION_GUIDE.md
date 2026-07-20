# ShirtCraft — Academic Presentation Guide

> Use this guide for your final-year project defense, seminar, or portfolio presentation.

---

## Slide 1: Title

**ShirtCraft**
*Custom T-Shirt Design & E-Commerce Platform*

Presented by: [Your Name]
Department: [Your Department]
Institution: [Your University]
Date: [Presentation Date]

---

## Slide 2: Problem Statement

### The Problem

Custom t-shirt printing in Nigeria faces significant challenges:

- **High minimum order quantities** — most printers require 50+ pieces, excluding individuals and small businesses
- **No design preview** — customers must describe their design verbally or via WhatsApp, leading to errors and wasted prints
- **Manual processes** — no self-service ordering, payment, or tracking. Everything is done via phone calls
- **Fragmented experience** — finding printers, negotiating prices, paying, and tracking are all separate, offline activities
- **Quality uncertainty** — customers cannot verify quality standards before committing

### The Opportunity

Over 60% of Nigerian SMEs need branded merchandise, and the youth market (18–35) is increasingly comfortable with online purchasing. A professional, self-service platform fills a clear gap.

---

## Slide 3: Project Objectives

1. **Build a professional design studio** — allow any user to create custom t-shirt designs without design skills
2. **Create a full e-commerce catalog** — browse, filter, and order premium blank t-shirts
3. **Implement secure payment processing** — Stripe and PayPal integration
4. **Develop an admin management system** — complete backend for running the business
5. **Ensure mobile accessibility** — responsive design for Nigeria's predominantly mobile internet users
6. **Deliver production-quality code** — suitable for real-world deployment

---

## Slide 4: Technologies Used

### Why each technology was chosen:

| Technology      | Why Chosen                                                    |
|-----------------|---------------------------------------------------------------|
| **React.js**    | Industry standard; component-based architecture enables reuse; large ecosystem |
| **Vite**        | Extremely fast development server; modern build tooling       |
| **Redux Toolkit**| Predictable global state; solves cart/auth state across components |
| **Framer Motion**| Production-quality animations without performance penalties   |
| **Fabric.js**   | The only JavaScript library powerful enough for a canvas design editor |
| **Recharts**    | Declarative chart components that integrate cleanly with React |
| **Node.js/Express** | JavaScript everywhere; large package ecosystem; fast I/O |
| **MongoDB**     | Flexible schema ideal for products with variable attributes (colors, sizes) |
| **Mongoose**    | Schema validation and clean query API for MongoDB             |
| **JWT**         | Stateless authentication; scales horizontally without session storage |
| **Stripe**      | Most developer-friendly payments API; supports NGN            |
| **Cloudinary**  | Automatic image optimisation, CDN delivery, transformation    |
| **Nodemailer**  | Node.js standard for transactional email                      |

---

## Slide 5: System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│                                                              │
│  Browser / Mobile App                                        │
│  React 18 + Vite │ Redux Toolkit │ Framer Motion            │
│  Fabric.js (Design Studio) │ Recharts (Admin Charts)         │
│                                                              │
│  ↕ HTTPS/REST API calls via Axios                            │
└──────────────────────────────────────────────────────────────┘
                            │
┌──────────────────────────────────────────────────────────────┐
│                        SERVER LAYER                          │
│                                                              │
│  Node.js + Express.js                                        │
│  ├── Routes (auth, products, orders, coupons, uploads)       │
│  ├── Controllers (business logic)                            │
│  ├── Middleware (JWT verify, admin-only, multer)             │
│  └── Utils (email, image upload)                             │
│                                                              │
│  ↕ Mongoose ODM                                              │
└──────────────────────────────────────────────────────────────┘
                            │
┌──────────────────────────────────────────────────────────────┐
│                       DATA / SERVICES LAYER                  │
│                                                              │
│  MongoDB Atlas          Cloudinary        Stripe / PayPal    │
│  (Database)             (Image CDN)       (Payments)         │
│                                                              │
│  Nodemailer             (Future: Redis for caching/queues)   │
│  (Email)                                                     │
└──────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions:

1. **SPA (Single Page Application)** — React handles all routing client-side; the server only serves JSON, not HTML pages
2. **JWT over Sessions** — stateless auth scales horizontally without shared session storage
3. **Embedded Order Items** — snapshot product data in orders to preserve historical accuracy
4. **Soft Deletes** — products and users are never hard-deleted; `isActive: false` hides them

---

## Slide 6: Feature Demonstrations

### Feature 1: Design Studio
- Fabric.js canvas with real-time shirt preview
- Upload logos, add text with custom fonts/colors
- Drag, resize, rotate all elements
- Undo/Redo history (stored as JSON snapshots)
- Front/back view toggle
- Download design as high-res PNG (2× multiplier for print quality)
- Direct "Add to Cart" with custom design attached

### Feature 2: Product Catalog
- 8+ products with filtering by category, color, size, price
- Real-time search as user types
- Sort by newest, rating, price, popularity
- Grid/list view toggle
- Quick-Add and wishlist toggle on hover

### Feature 3: Cart & Checkout
- Persistent cart (localStorage, survives page refresh)
- Coupon code validation (`SHIRT10`, `CRAFT20`, `BULK30`)
- 3-step checkout: Shipping → Payment → Review
- Stripe card input / bank transfer / PayPal options
- Free shipping threshold (₦10,000+)

### Feature 4: Customer Dashboard
- Order history with status tracking
- Wishlist management
- Profile editing and address book

### Feature 5: Admin Dashboard
- Revenue area chart and order bar chart (Recharts)
- Order status donut chart
- Top products table
- Full product CRUD with image upload
- Coupon management with usage tracking and progress bars

---

## Slide 7: Challenges Encountered

| Challenge | Solution Applied |
|-----------|-----------------|
| **Fabric.js TypeScript conflicts** | Used JavaScript (not TS), imported Fabric.js via npm and initialised after DOM mount using `useEffect` |
| **Cart persistence across sessions** | Stored cart state in `localStorage` via Redux slice reducers; loaded on app init |
| **Undo/Redo in canvas editor** | Maintained a history array of canvas JSON snapshots; restored by calling `canvas.loadFromJSON()` |
| **JWT token expiry handling** | Axios response interceptor catches all `401` errors and auto-redirects to `/login` |
| **Responsive design editor on mobile** | Collapsed left panel on screens < 1024px; touch events handled natively by Fabric.js |
| **MongoDB embedded vs. referenced** | Embedded order items (not referenced products) to preserve historical pricing data |
| **Email delivery in development** | Ethereal (fake SMTP) auto-configured when no credentials present — generates preview URLs |
| **Avoiding flash of unauthenticated content** | `ProtectedRoute` checks Redux state synchronously; `fetchMe` hydrates state from stored JWT on load |

---

## Slide 8: Future Improvements

| Feature | Description | Priority |
|---------|-------------|----------|
| **AI Design Suggestions** | Use an LLM API to suggest layout improvements based on uploaded content | High |
| **3D Shirt Preview** | Three.js powered 3D mockup instead of flat SVG | Medium |
| **Bulk Order System** | Quote builder for 50+ pieces with tiered pricing | High |
| **Mobile App** | React Native version for iOS/Android | Medium |
| **Real-time Notifications** | WebSockets or Server-Sent Events for live order updates | Medium |
| **Multi-vendor** | Allow multiple printing companies to list on the platform | Future |
| **Paystack Integration** | Nigeria-specific payment gateway (more popular than Stripe locally) | High |
| **PWA Support** | Offline capability and "Add to Home Screen" for mobile users | Medium |
| **AI Background Removal** | Auto-remove image backgrounds on design upload | Low |
| **Redis Caching** | Cache product catalog responses to reduce DB load | Future |

---

## Slide 9: Testing Strategy

| Layer      | Approach                                                     |
|------------|--------------------------------------------------------------|
| Unit tests | Jest for Redux slices (actions, reducers)                    |
| Integration| Supertest for Express routes (mocked MongoDB with mongodb-memory-server) |
| E2E        | Cypress for critical user flows (register → design → checkout) |
| Manual     | Tested on Chrome, Firefox, Safari; iOS Safari, Android Chrome |

```bash
# Run unit tests
cd client && npm test

# Run API tests
cd server && npm test

# Run E2E
cd client && npx cypress open
```

---

## Slide 10: Conclusion

ShirtCraft successfully demonstrates:

✅ **Full-stack proficiency** — React, Node.js, MongoDB, and third-party service integration  
✅ **Modern architecture** — component-based frontend, RESTful API, NoSQL database  
✅ **Real-world features** — authentication, payments, email, image upload, canvas editor  
✅ **Production readiness** — responsive design, error handling, security middleware  
✅ **Business viability** — solves a real market need in the Nigerian custom apparel space  

---

## Demo Script (5 minutes)

1. **(0:00)** Land on homepage — point out the animated hero shirt and colour picker
2. **(0:40)** Open catalog — apply filters (Polo, Black, under ₦9,000)
3. **(1:10)** Open a product detail — show image gallery, size picker, wishlist
4. **(1:40)** Open Design Studio — add text, change font/colour, upload a logo, drag elements
5. **(2:30)** Add custom design to cart — show cart drawer with coupon field (`CRAFT20`)
6. **(3:00)** Proceed to checkout — step through shipping + payment forms
7. **(3:40)** Show order success screen
8. **(4:00)** Log in as `admin@shirtcraft.com` — walk through admin dashboard charts
9. **(4:40)** Q&A

---

*"ShirtCraft proves that complex, production-grade software systems can be built efficiently using modern JavaScript tooling, open-source libraries, and well-established architectural patterns."*
