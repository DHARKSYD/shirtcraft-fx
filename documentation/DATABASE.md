# ShirtCraft — Database Documentation

**Database:** MongoDB 7.0 (NoSQL Document Store)
**ODM:** Mongoose 8.x

---

## Collections Overview

| Collection | Documents | Purpose                            |
|------------|-----------|------------------------------------|
| `users`    | ∞         | Customer and admin accounts        |
| `products` | ~50–500   | T-shirt catalog                    |
| `orders`   | ∞         | Placed customer orders             |
| `coupons`  | ~10–100   | Discount codes                     |

---

## Schema: `users`

Stores both **customer** and **admin** accounts.

```
users
├── _id              ObjectId       (auto-generated primary key)
├── name             String         required, trimmed
├── email            String         required, unique, lowercase
├── password         String         required, bcrypt-hashed, hidden from queries
├── role             String         "customer" | "admin" (default: "customer")
├── phone            String         optional
├── avatar           String         Cloudinary URL
├── isActive         Boolean        soft-delete flag (default: true)
├── wishlist         [ObjectId]     → refs Product._id
├── resetPasswordToken   String     hex token for forgot-password flow
├── resetPasswordExpires Date       expiry for reset token
├── addresses[]      Embedded array
│   ├── _id          ObjectId
│   ├── label        String         e.g. "Home", "Office"
│   ├── street       String         required
│   ├── city         String         required
│   ├── state        String         required
│   ├── zipCode      String
│   ├── country      String         default "Nigeria"
│   └── isDefault    Boolean        one address per user is default
├── createdAt        Date           auto (Mongoose timestamps)
└── updatedAt        Date           auto
```

**Indexes:**
- `{ email: 1 }` — unique index for fast login lookups

**Methods:**
- `comparePassword(candidate)` — async bcrypt comparison
- `toJSON()` — removes `password` from serialised output

---

## Schema: `products`

Represents a single t-shirt style (not an individual item in an order).

```
products
├── _id             ObjectId
├── name            String         required, e.g. "Essential Classic Tee"
├── slug            String         unique, auto-generated from name
├── description     String         required
├── price           Number         in Naira (NGN), e.g. 4999
├── comparePrice    Number         original/strikethrough price
├── category        String         "Classic Tees", "Premium Fitted", etc.
├── images          [String]       Cloudinary URLs, first is thumbnail
├── colors          [String]       e.g. ["white", "black", "navy"]
├── sizes           [String]       ["XS","S","M","L","XL","2XL","3XL"]
├── features        [String]       e.g. ["100% Cotton", "180 GSM"]
├── tags            [String]       ["bestseller", "new", "trending", "eco"]
├── stock           Number         units in stock (default: 0)
├── rating          Number         0–5, computed from reviews (1 decimal)
├── reviewCount     Number         total number of reviews
├── isActive        Boolean        soft-delete (default: true)
├── reviews[]       Embedded array
│   ├── user        ObjectId       → refs User._id
│   ├── name        String         reviewer's display name
│   ├── rating      Number         1–5
│   ├── comment     String
│   └── createdAt   Date
├── createdAt       Date
└── updatedAt       Date
```

**Indexes:**
- `{ slug: 1 }` — unique, for URL-based lookups
- `{ category: 1, isActive: 1 }` — compound, for filtered catalog queries
- `{ tags: 1 }` — for featured/bestseller queries

**Methods:**
- `updateRating()` — recomputes `rating` and `reviewCount` from embedded reviews

---

## Schema: `orders`

One document per placed order. Items are embedded (denormalised) to capture the price at the time of purchase.

```
orders
├── _id             ObjectId
├── orderNumber     String         unique, e.g. "ORD-2025-0042"
├── user            ObjectId       → refs User._id (who placed the order)
├── items[]         Embedded array (snapshot of cart at purchase time)
│   ├── product     ObjectId       → refs Product._id (nullable for custom designs)
│   ├── name        String
│   ├── price       Number         price at time of purchase (not current product price)
│   ├── image       String
│   ├── size        String
│   ├── color       String
│   ├── quantity    Number
│   └── customDesign String       Base64 or Cloudinary URL for custom designs
├── shipping        Embedded object
│   ├── name        String
│   ├── phone       String
│   ├── street      String
│   ├── city        String
│   ├── state       String
│   └── country     String
├── paymentMethod   String         "card" | "transfer" | "paypal"
├── paymentStatus   String         "pending" | "paid" | "failed" | "refunded"
├── paymentId       String         Stripe PaymentIntent ID or PayPal transaction ID
├── subtotal        Number         sum of item totals before discounts
├── discount        Number         amount subtracted (not percentage)
├── shippingCost    Number         0 if free, otherwise 1500
├── total           Number         final charged amount
├── coupon          String         code used (if any)
├── status          String         "pending"|"processing"|"shipped"|"delivered"|"cancelled"
├── trackingNumber  String
├── notes           String
├── createdAt       Date
└── updatedAt       Date
```

**Indexes:**
- `{ user: 1, createdAt: -1 }` — for customer's "my orders" query
- `{ status: 1 }` — for admin filtering
- `{ orderNumber: 1 }` — unique

**Design Decision — Embedding vs. Referencing:**
Order items are **embedded** (not referenced). This means:
- If a product is later deleted or its price changes, the order record still contains the correct historical data.
- Trade-off: no automatic join when product details change, but for orders this is desirable.

---

## Schema: `coupons`

```
coupons
├── _id             ObjectId
├── code            String         unique, uppercase (e.g. "SHIRT10")
├── discount        Number         1–100 (percentage) or fixed amount in Naira
├── type            String         "percentage" | "fixed"
├── usageLimit      Number         null = unlimited
├── usageCount      Number         incremented on each use
├── expiresAt       Date           null = never expires
├── isActive        Boolean
├── minOrderValue   Number         minimum cart value to apply coupon
├── createdAt       Date
└── updatedAt       Date
```

**Methods:**
- `isValid()` — checks `isActive`, `expiresAt`, and `usageLimit`

---

## Relationships Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  USERS                                                       │
│  _id | name | email | role | addresses[] | wishlist[]       │
└──────────────────┬──────────────────────────────────────────┘
                   │ 1 user has many orders
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  ORDERS                                                      │
│  _id | user(ref) | items[] | shipping | status | total      │
│                                                             │
│  items[] (embedded — snapshot at purchase):                 │
│    product(ref, optional) | name | price | size | color     │
└──────────────────┬──────────────────────────────────────────┘
                   │ item.product → (soft reference only)
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  PRODUCTS                                                    │
│  _id | name | slug | price | colors | sizes | reviews[]     │
│                                                             │
│  reviews[] (embedded):                                      │
│    user(ref) | rating | comment                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  COUPONS                                                     │
│  _id | code | discount | type | usageLimit | expiresAt      │
└─────────────────────────────────────────────────────────────┘
  (Applied to orders via order.coupon = coupon.code string)
```

---

## Indexes Summary

```javascript
// users
db.users.createIndex({ email: 1 }, { unique: true });

// products
db.products.createIndex({ slug: 1 }, { unique: true });
db.products.createIndex({ category: 1, isActive: 1 });
db.products.createIndex({ tags: 1 });
db.products.createIndex({ name: 'text', description: 'text' }); // full-text search

// orders
db.orders.createIndex({ orderNumber: 1 }, { unique: true });
db.orders.createIndex({ user: 1, createdAt: -1 });
db.orders.createIndex({ status: 1 });

// coupons
db.coupons.createIndex({ code: 1 }, { unique: true });
```

---

## Seeding the Database

A seed script is recommended for development. Create `server/utils/seed.js`:

```javascript
const mongoose = require('mongoose');
const Product  = require('../models/Product');
const User     = require('../models/User');

// ... import mock data, connect, and insert
```

Run with: `node server/utils/seed.js`
