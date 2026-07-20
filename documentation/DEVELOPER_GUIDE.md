# ShirtCraft — Developer Guide

> A beginner-friendly guide to understanding every system in the project.

---

## 1. How React Routing Works

React Router v6 gives us **client-side navigation** — when you click a link, the page does not reload. Instead, React swaps out the component being shown.

```
URL: /catalog          → Shows <Catalog /> component
URL: /products/p1      → Shows <ProductDetail /> with id="p1"
URL: /admin/products   → Shows <AdminProducts /> (inside AdminLayout)
```

### Key concepts:

**`<Routes>` and `<Route>`** — defined in `App.jsx`. Think of it as a list of "if URL matches X, show component Y".

```jsx
<Routes>
  <Route path="/"          element={<Home />} />
  <Route path="/catalog"   element={<Catalog />} />
  <Route path="/products/:id" element={<ProductDetail />} />
</Routes>
```

**`:id`** is a dynamic segment — `useParams()` gives you its value:
```jsx
const { id } = useParams(); // e.g. "p1"
```

**Nested Routes** — `Dashboard` wraps child pages (Orders, Wishlist, Profile) using `<Outlet />`. The child renders where `<Outlet />` is placed.

**`<ProtectedRoute>`** — a wrapper that checks if the user is logged in. If not, it redirects to `/login`.

---

## 2. How Redux Works

Redux is a **global state manager**. Think of it as a single JavaScript object that all components can read from and write to.

### Our store has 6 slices:

| Slice      | What it stores                              |
|------------|---------------------------------------------|
| `auth`     | Logged-in user, JWT token, loading state    |
| `cart`     | Cart items, coupon, open/close state        |
| `wishlist` | Wishlisted product IDs                      |
| `products` | Product list, current product, filters      |
| `orders`   | Order history, current order                |
| `ui`       | Toast messages, nav open state              |

### How to read from the store:
```jsx
import { useSelector } from 'react-redux';
const cartItems = useSelector(state => state.cart.items);
```

### How to write to the store:
```jsx
import { useDispatch } from 'react-redux';
import { addToCart } from '../store/slices/cartSlice';

const dispatch = useDispatch();
dispatch(addToCart({ id: 'p1', name: 'Classic Tee', price: 4999, quantity: 1 }));
```

### Async operations (API calls):
We use `createAsyncThunk`:
```jsx
// In the slice:
export const fetchProducts = createAsyncThunk('products/fetchAll', async (params) => {
  const { data } = await api.get('/products', { params });
  return data; // this becomes the `payload` in extraReducers
});

// In a component:
dispatch(fetchProducts({ category: 'Classic Tees', page: 1 }));
```

---

## 3. How Authentication Works

### Login flow:
```
1. User submits email + password
2. POST /api/auth/login
3. Server checks email in MongoDB, compares password with bcrypt
4. If valid → server signs a JWT with the user's ID
5. Client stores JWT in localStorage
6. All future API requests include: Authorization: Bearer <token>
7. Server's `protect` middleware verifies the token on every protected route
```

### JWT (JSON Web Token):
A JWT looks like: `xxxxx.yyyyy.zzzzz`
- Header (algorithm type)
- Payload (user ID, expiry)
- Signature (server verifies this is genuine)

The server never stores the token — it just verifies it. This makes the system **stateless**.

### Protected routes:
```jsx
// App.jsx — wraps any route that needs login
<Route path="/checkout" element={
  <ProtectedRoute>
    <Checkout />
  </ProtectedRoute>
} />
```

---

## 4. How the Database Works

MongoDB stores data as **documents** (like JSON objects) inside **collections** (like tables).

Example document in the `products` collection:
```json
{
  "_id": "64abc123",
  "name": "Essential Classic Tee",
  "price": 4999,
  "colors": ["white", "black"],
  "reviews": [
    { "user": "64user456", "rating": 5, "comment": "Perfect!" }
  ]
}
```

**Mongoose** is the layer between Node.js and MongoDB:
```javascript
// Define a schema
const productSchema = new mongoose.Schema({ name: String, price: Number });
const Product = mongoose.model('Product', productSchema);

// Query
const products = await Product.find({ category: 'Classic Tees' }).limit(12);
```

---

## 5. How API Calls Work

The frontend uses **Axios** (`src/utils/api.js`) to talk to the backend.

### Axios instance:
```javascript
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 15000,
});
```

### Request interceptor:
Automatically attaches the JWT to every request:
```javascript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### Response interceptor:
If the server returns `401 Unauthorized`, clears localStorage and redirects to `/login`.

---

## 6. How the Design Studio Works

The Design Studio uses **Fabric.js**, a powerful canvas manipulation library.

### Initialisation:
```javascript
const canvas = new fabric.Canvas(canvasRef.current, {
  width: 520, height: 560,
});
```

### Adding text:
```javascript
const text = new fabric.IText('Your Text', {
  left: 160, top: 220,
  fontFamily: 'Space Grotesk',
  fontSize: 36,
  fill: '#0D0D0D',
});
canvas.add(text);
```

### Adding an uploaded image:
```javascript
fabric.Image.fromURL(dataURL, (img) => {
  img.scale(0.5); // resize
  canvas.add(img);
});
```

### Undo / Redo:
We save the canvas JSON state to an array after every change:
```javascript
const saveHistory = () => {
  historyRef.current.push(JSON.stringify(canvas.toJSON()));
};

const undo = () => {
  histIdxRef.current--;
  canvas.loadFromJSON(historyRef.current[histIdxRef.current], canvas.renderAll.bind(canvas));
};
```

### Export design:
```javascript
const dataURL = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
// multiplier: 2 = 2x resolution for print quality
```

---

## 7. How Payments Work

### Stripe integration flow:

```
1. Customer clicks "Proceed to Checkout"
2. Client calls POST /api/orders/payment-intent  { amount: 899900 }
3. Server creates a Stripe PaymentIntent and returns clientSecret
4. Client uses Stripe.js to collect card details (Elements)
5. Stripe confirms the payment → returns paymentId
6. Client calls POST /api/orders  { ..., paymentId }
7. Server creates order with paymentStatus: "paid"
8. Confirmation email sent to customer
```

### Demo mode:
When `STRIPE_SECRET_KEY` is not set, the payment step is simulated — the order is created with `paymentStatus: "pending"` and a mock `paymentId`.

---

## 8. How Order Processing Works

```
Customer places order
        │
        ▼
Order created in DB (status: "pending")
        │
        ▼ (admin action)
Status → "processing"   (Admin starts preparing the order)
        │
        ▼ (admin adds tracking number)
Status → "shipped"      (Customer notified by email)
        │
        ▼
Status → "delivered"    (Customer notified by email)
```

### Status transitions:

| From          | To           | Trigger                        |
|---------------|--------------|--------------------------------|
| `pending`     | `processing` | Admin updates in dashboard     |
| `processing`  | `shipped`    | Admin adds tracking number     |
| `shipped`     | `delivered`  | Admin or automated webhook     |
| any           | `cancelled`  | Admin cancels the order        |

### Email at each stage:
`server/utils/email.js` — `sendEmail()` is called asynchronously after status changes. It never blocks the response.

---

## Common Development Tasks

### Add a new page
1. Create `src/pages/NewPage.jsx`
2. Add a route in `src/App.jsx`:
   ```jsx
   <Route path="/new-page" element={<NewPage />} />
   ```
3. Add a link in `Navbar.jsx`

### Add a new Redux slice
1. Create `src/store/slices/newSlice.js`
2. Import and add to `src/store/index.js` under `reducer: {}`

### Add a new API endpoint
1. Define the route in `server/routes/`
2. Write the controller in `server/controllers/`
3. Import the route in `server/index.js`:
   ```javascript
   app.use('/api/new', require('./routes/new'));
   ```

### Change the design system colours
Edit `src/styles/global.css` under `:root {}` — all components use CSS custom properties so the change cascades automatically.
