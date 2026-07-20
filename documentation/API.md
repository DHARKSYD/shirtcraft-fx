# ShirtCraft — API Documentation

Base URL: `http://localhost:5000/api`

All protected routes require the header:
```
Authorization: Bearer <token>
```

---

## Authentication

### POST `/auth/register`
Register a new customer account.

**Request body:**
```json
{
  "name": "Adaobi Chukwu",
  "email": "adaobi@example.com",
  "password": "SecurePass123"
}
```

**Response `201`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "64abc123",
    "name": "Adaobi Chukwu",
    "email": "adaobi@example.com",
    "role": "customer",
    "createdAt": "2025-06-18T10:00:00.000Z"
  }
}
```

**Errors:** `400` Validation error · `409` Email already exists

---

### POST `/auth/login`
**Request body:**
```json
{ "email": "adaobi@example.com", "password": "SecurePass123" }
```
**Response `200`:** Same structure as register.

**Errors:** `401` Invalid credentials · `403` Account deactivated

---

### GET `/auth/me` 🔐
Returns the authenticated user's profile.

**Response `200`:**
```json
{
  "_id": "64abc123",
  "name": "Adaobi Chukwu",
  "email": "adaobi@example.com",
  "role": "customer",
  "addresses": [],
  "wishlist": []
}
```

---

### POST `/auth/forgot-password`
**Request:** `{ "email": "adaobi@example.com" }`
**Response `200`:** `{ "message": "Password reset email sent." }`

---

### POST `/auth/reset-password/:token`
**Request:** `{ "password": "NewPassword123" }`
**Response `200`:** `{ "token": "...", "message": "Password reset successful." }`

---

## Products

### GET `/products`
Get paginated product list with filtering and sorting.

**Query parameters:**

| Parameter | Type   | Default  | Description                              |
|-----------|--------|----------|------------------------------------------|
| `search`  | string | —        | Full-text search (name, description)     |
| `category`| string | —        | Filter by category name                  |
| `size`    | string | —        | Filter by size (XS, S, M, L, XL, 2XL)   |
| `color`   | string | —        | Filter by color                          |
| `minPrice`| number | 0        | Minimum price (in Naira kobo)            |
| `maxPrice`| number | 10000000 | Maximum price                            |
| `sort`    | string | newest   | newest, price-asc, price-desc, rating, popular |
| `page`    | number | 1        | Page number                              |
| `limit`   | number | 12       | Items per page                           |

**Response `200`:**
```json
{
  "products": [
    {
      "_id": "prod123",
      "name": "Essential Classic Tee",
      "slug": "essential-classic-tee",
      "price": 4999,
      "comparePrice": 6499,
      "category": "Classic Tees",
      "images": ["https://..."],
      "colors": ["white", "black", "navy"],
      "sizes": ["XS","S","M","L","XL","2XL"],
      "rating": 4.8,
      "reviewCount": 247,
      "stock": 150,
      "tags": ["bestseller"]
    }
  ],
  "total": 48,
  "pages": 4,
  "page": 1
}
```

---

### GET `/products/:id`
Get a single product by `_id` or `slug`. Includes reviews.

---

### POST `/products/:id/reviews` 🔐
Add a review to a product.

**Request:**
```json
{ "rating": 5, "comment": "Excellent quality!" }
```

**Response `201`:**
```json
{ "message": "Review added.", "rating": 4.9, "reviewCount": 248 }
```

**Errors:** `409` Already reviewed

---

### POST `/products` 🔐 👑
Create a new product (admin only).

**Request body:**
```json
{
  "name": "New Classic Tee",
  "description": "Premium ring-spun cotton",
  "price": 4999,
  "comparePrice": 6499,
  "category": "Classic Tees",
  "images": ["https://..."],
  "colors": ["white", "black"],
  "sizes": ["S","M","L","XL"],
  "features": ["100% Cotton", "180 GSM"],
  "tags": ["new"],
  "stock": 100
}
```

---

### PUT `/products/:id` 🔐 👑
Update product fields (admin only). Send only changed fields.

---

### DELETE `/products/:id` 🔐 👑
Soft-deletes product by setting `isActive: false` (admin only).

---

## Orders

### POST `/orders` 🔐
Create a new order.

**Request body:**
```json
{
  "items": [
    {
      "product": "prod123",
      "name": "Essential Classic Tee",
      "price": 4999,
      "size": "L",
      "color": "black",
      "quantity": 2
    }
  ],
  "shipping": {
    "name": "Adaobi Chukwu",
    "phone": "+2348012345678",
    "street": "12 Allen Avenue",
    "city": "Lagos",
    "state": "Lagos"
  },
  "paymentMethod": "card",
  "paymentId": "pi_3O...",
  "couponCode": "SHIRT10"
}
```

**Response `201`:**
```json
{
  "_id": "order456",
  "orderNumber": "ORD-2025-0042",
  "status": "processing",
  "paymentStatus": "paid",
  "subtotal": 9998,
  "discount": 999,
  "shippingCost": 0,
  "total": 8999,
  "createdAt": "2025-06-18T..."
}
```

---

### POST `/orders/payment-intent` 🔐
Create a Stripe PaymentIntent before charging.

**Request:** `{ "amount": 899900 }` (in kobo)
**Response:** `{ "clientSecret": "pi_3O...._secret_..." }`

---

### GET `/orders/my` 🔐
Returns all orders placed by the authenticated customer.

---

### GET `/orders/:id` 🔐
Get a specific order. Customers can only view their own.

---

### GET `/orders` 🔐 👑
Get all orders with optional `?status=` filter (admin only).

---

### PUT `/orders/:id/status` 🔐 👑
Update order status (admin only).

**Request:** `{ "status": "shipped" }`
Valid statuses: `pending` → `processing` → `shipped` → `delivered` · `cancelled`

---

### PUT `/orders/:id/tracking` 🔐 👑
Add a tracking number and auto-set status to `shipped`.

**Request:** `{ "trackingNumber": "SC2025001NG" }`

---

## Coupons

### POST `/coupons/validate` 🔐
Validate a coupon code before checkout.

**Request:** `{ "code": "SHIRT10", "orderValue": 9998 }`
**Response `200`:** `{ "discount": 10, "type": "percentage", "code": "SHIRT10" }`
**Errors:** `400` Invalid/expired coupon

---

### GET `/coupons` 🔐 👑
List all coupons (admin only).

---

### POST `/coupons` 🔐 👑
Create a coupon (admin only).

```json
{
  "code": "SUMMER25",
  "discount": 25,
  "type": "percentage",
  "usageLimit": 100,
  "expiresAt": "2025-08-31T00:00:00Z",
  "minOrderValue": 5000
}
```

---

## Users (Admin)

### GET `/users` 🔐 👑
Get paginated customer list.

---

### PUT `/users/profile` 🔐
Update authenticated user's name, phone, avatar.

---

### POST `/users/addresses` 🔐
Add a delivery address.

---

### DELETE `/users/addresses/:addrId` 🔐
Remove a saved address.

---

### PUT `/users/wishlist/:productId` 🔐
Toggle a product in/out of wishlist.

---

## Uploads

### POST `/uploads/image` 🔐
Upload an image to Cloudinary.

**Form data:** `image` (file, max 5MB, JPEG/PNG/SVG/WebP)

**Response:**
```json
{
  "url": "https://res.cloudinary.com/your_cloud/image/upload/shirtcraft/abc123.jpg",
  "publicId": "shirtcraft/abc123"
}
```

---

## Admin Analytics

### GET `/admin/stats` 🔐 👑
```json
{
  "totalRevenue": 5380000,
  "totalOrders": 876,
  "totalCustomers": 521,
  "topProducts": [
    { "_id": "Essential Classic", "sales": 847, "revenue": 4230153 }
  ]
}
```

### GET `/admin/revenue?period=6months` 🔐 👑
Monthly revenue breakdown for charts.

---

## Error Response Format

All errors follow this structure:
```json
{
  "message": "Human-readable error description",
  "stack": "..." // Only in development mode
}
```

**Common HTTP codes:**

| Code | Meaning                        |
|------|--------------------------------|
| 400  | Bad request / validation error |
| 401  | Not authenticated              |
| 403  | Forbidden (wrong role)         |
| 404  | Resource not found             |
| 409  | Conflict (duplicate)           |
| 500  | Internal server error          |

---

🔐 = Requires authentication · 👑 = Admin role required
