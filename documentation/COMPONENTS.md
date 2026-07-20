# ShirtCraft — Component Documentation

---

## Layout Components

### `<Navbar />`
**File:** `src/components/Layout/Navbar.jsx`

Sticky top navigation bar. Transparent on top, adds shadow on scroll.

| Prop | Type | Description |
|------|------|-------------|
| none | —    | Reads from Redux `auth`, `cart`, `wishlist` slices |

**Key behaviours:**
- Hides completely on `/design-studio` (studio has its own toolbar)
- Hamburger menu on mobile (< 769px) with slide-down panel
- User avatar dropdown with name, orders link, admin link, logout
- Cart icon shows item count badge (accent orange)

---

### `<Footer />`
**File:** `src/components/Layout/Footer.jsx`

Dark footer with 5-column link grid. Hidden on `/checkout` and `/design-studio`.

---

## Cart Components

### `<CartDrawer />`
**File:** `src/components/Cart/CartDrawer.jsx`

Slide-in cart panel from the right. Contains:
- Item list with qty controls and remove button
- Coupon code input (validates against `VALID_COUPONS` in mockData)
- Order summary (subtotal, discount, shipping, total)
- "Checkout" CTA and "View full cart" link

**Redux:** Reads `cart` slice, dispatches `removeFromCart`, `updateQuantity`, `applyCoupon`, `closeCart`

---

## UI Components

### `<Toast />`
**File:** `src/components/UI/Toast.jsx`

Global notification toast. Appears bottom-right. Auto-dismisses after 3.5 seconds.

**Types:** `success` (green icon) · `error` (red icon) · `info` (blue icon)

**Usage:**
```jsx
dispatch(showToast({ message: 'Added to cart!', type: 'success' }));
dispatch(showToast({ message: 'Error occurred', type: 'error', duration: 5000 }));
```

---

### `<ProtectedRoute />`
**File:** `src/components/UI/ProtectedRoute.jsx`

Route guard component. Redirects unauthenticated users to `/login`, preserving the intended destination in `location.state.from` for post-login redirect.

| Prop        | Type    | Default | Description                   |
|-------------|---------|---------|-------------------------------|
| `children`  | ReactNode | —     | The protected page component  |
| `adminOnly` | boolean | `false` | Also requires `role === 'admin'` |

---

## Product Components

### `<ProductCard />`
**File:** `src/components/Product/ProductCard.jsx`

Reusable card used in the catalog grid, home page featured section, and related products. Hover reveals:
- Image swap (if 2+ images exist)
- "Quick Add" CTA (adds default size M)
- Wishlist heart button (fills on wishlisted)

| Prop      | Type    | Description                     |
|-----------|---------|---------------------------------|
| `product` | Product | Product object from `mockData`  |

**Emits Redux actions:** `addToCart`, `toggleWishlist`, `showToast`

---

## Pages

### `<Home />`
**File:** `src/pages/Home.jsx`

Marketing landing page. Key sections:
- **Hero** — animated floating SVG shirt that changes colour when user clicks swatches
- **Stats bar** — animated counters (50k shirts, 5.2k customers, etc.)
- **Features** — 4-card grid
- **Featured Products** — bestseller/trending products from mock data
- **Studio CTA** — dark banner with floating shirt illustrations
- **Process Steps** — 4-step "how it works"
- **Testimonials** — 3 customer quotes
- **Final CTA** — registration banner

---

### `<Catalog />`
**File:** `src/pages/Catalog.jsx`

Product listing page.

- **Filter state** is purely local (`useState`) — no Redux (no need to persist)
- **Filtering** is done client-side in a `useMemo` for instant results in demo mode
- **Mobile filters** appear as a full-screen slide-in drawer (`AnimatePresence` + `motion.div`)
- **Sort options:** newest, price asc/desc, rating, popular
- **View toggle:** grid (3 columns) ↔ list (single column)

---

### `<DesignStudio />`
**File:** `src/pages/DesignStudio.jsx`

Full-screen canvas editor. The Navbar hides on this route.

Key `useRef` values:
- `canvasRef` — DOM canvas element reference
- `fabricRef` — Fabric.js Canvas instance
- `historyRef` — array of JSON snapshot strings
- `histIdxRef` — current position in history

**Print area** — a red dashed rectangle rendered as a non-selectable Fabric object, guiding the user to keep designs within the printable zone.

---

### `<ProductDetail />`
**File:** `src/pages/ProductDetail.jsx`

- Looks up product from `MOCK_PRODUCTS` by URL `:id` param
- Image gallery with prev/next chevron buttons, animated crossfade
- Tabs: Description (features list) | Reviews (from `MOCK_REVIEWS`)
- Related products section (same category, excluding current)

---

### `<Cart />`
**File:** `src/pages/Cart.jsx`

Full cart page (different from the drawer). Sticky summary sidebar with grand total including shipping calculation (`total > ₦10,000 → free`).

---

### `<Checkout />`
**File:** `src/pages/Checkout.jsx`

3-step multi-form checkout:
1. **Shipping Details** — name, phone, street, city, state
2. **Payment Method** — card form (Stripe inputs), bank transfer info, PayPal
3. **Review & Place Order** — summary before confirming

Uses `AnimatePresence` with `mode="wait"` for slide transitions between steps.

---

### `<Dashboard />` (layout)
**File:** `src/pages/Dashboard/Dashboard.jsx`

Wrapper with sidebar nav and `<Outlet />`. Sticky sidebar on desktop, horizontal nav on mobile.

Child routes: `<Orders />`, `<Wishlist />`, `<Profile />`

---

### `<AdminLayout />`
**File:** `src/pages/Admin/AdminLayout.jsx`

Dark sidebar with icon + label navigation. Uses `<NavLink>` for active highlighting.

Child routes: `<AdminDashboard />`, `<AdminProducts />`, `<AdminOrders />`, `<AdminCustomers />`, `<AdminCoupons />`

---

### `<AdminDashboard />`
**File:** `src/pages/Admin/AdminDashboard.jsx`

4 stat cards + 2 Recharts charts (AreaChart + BarChart) + PieChart (order status) + top products table + recent orders table.

All data from `ANALYTICS_DATA` and `MOCK_ORDERS` in `mockData.js`. In production, these are replaced with API calls to `/api/admin/stats` and `/api/admin/revenue`.

---

## Utility Functions

### `src/utils/api.js`
Axios instance with `baseURL`, JWT interceptor, and 401 redirect.

### `src/utils/mockData.js`
All demo data: `MOCK_PRODUCTS`, `MOCK_REVIEWS`, `MOCK_ORDERS`, `ANALYTICS_DATA`, `SHIRT_COLORS`, `SIZES`, `CATEGORIES`, `VALID_COUPONS`.

In production, components replace these local imports with Redux async thunks that call the backend.

---

## Design System

**File:** `src/styles/global.css`

All colours, typography, spacing, shadows, and border radii are defined as **CSS custom properties** on `:root`. Every component inherits from these tokens.

Key tokens:
```css
--color-accent: #FF4F1F    /* Coral-fire orange — primary brand colour */
--font-display: 'Space Grotesk', sans-serif
--font-body:    'Inter', sans-serif
--font-mono:    'Space Mono', monospace
--radius-full:  9999px     /* For pill-shaped buttons and badges */
--transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1)
```

Changing any token here cascades through the entire application instantly.
