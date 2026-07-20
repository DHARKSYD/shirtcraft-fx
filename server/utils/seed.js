// server/utils/seed.js
// Run with: node server/utils/seed.js
// Seeds the database with sample products, an admin user, and coupons.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');
const Product  = require('../models/Product');
const Order    = require('../models/Order');
const Coupon   = require('../models/Coupon');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shirtcraft';

// ── Sample data ───────────────────────────────────────────────────
const ADMIN = {
  name:     'Admin User',
  email:    'admin@shirtcraft.com',
  password: 'Admin1234!',
  role:     'admin',
};

const CUSTOMER = {
  name:     'Adaobi Chukwu',
  email:    'adaobi@example.com',
  password: 'Customer123!',
  role:     'customer',
};

const PRODUCTS = [
  {
    name:        'Essential Classic Tee',
    slug:        'essential-classic-tee',
    description: 'Our most popular base tee. 100% premium ring-spun cotton, pre-shrunk with a tailored fit that works for everyone.',
    price:       4999,
    comparePrice:6499,
    category:    'Classic Tees',
    images:      ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80'],
    colors:      ['white','black','navy','grey'],
    sizes:       ['XS','S','M','L','XL','2XL','3XL'],
    features:    ['100% Ring-Spun Cotton','180 GSM','Double-needle stitching','Machine washable'],
    tags:        ['bestseller'],
    stock:       150,
    rating:      4.8,
    reviewCount: 247,
  },
  {
    name:        'Premium Fitted Crew',
    slug:        'premium-fitted-crew',
    description: 'Superior comfort meets impeccable fit. Crafted from Supima cotton for a luxurious feel.',
    price:       6499,
    comparePrice:8999,
    category:    'Premium Fitted',
    images:      ['https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&q=80'],
    colors:      ['black','white','navy','red'],
    sizes:       ['S','M','L','XL','2XL'],
    features:    ['100% Supima Cotton','200 GSM','Shrink-resistant','Tear-away label'],
    tags:        ['premium'],
    stock:       80,
    rating:      4.9,
    reviewCount: 183,
  },
  {
    name:        'Oversized Drop Shoulder',
    slug:        'oversized-drop-shoulder',
    description: 'The perfect streetwear silhouette. Relaxed drop-shoulder construction with a boxy fit.',
    price:       7999,
    category:    'Oversized',
    images:      ['https://images.unsplash.com/photo-1562157873-818bc0726f68?w=600&q=80'],
    colors:      ['white','black','grey','purple'],
    sizes:       ['S','M','L','XL'],
    features:    ['240 GSM Heavyweight','Drop shoulder','Unisex fit','Ribbed collar'],
    tags:        ['trending'],
    stock:       60,
    rating:      4.7,
    reviewCount: 129,
  },
  {
    name:        'Sport Performance Polo',
    slug:        'sport-performance-polo',
    description: 'Professional quality polo with moisture-wicking technology.',
    price:       8999,
    comparePrice:11999,
    category:    'Polo Shirts',
    images:      ['https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=600&q=80'],
    colors:      ['navy','white','black','green'],
    sizes:       ['XS','S','M','L','XL','2XL','3XL'],
    features:    ['60% Cotton 40% Polyester','Moisture-wicking','3-button placket','Pique fabric'],
    tags:        ['new'],
    stock:       45,
    rating:      4.6,
    reviewCount: 94,
  },
  {
    name:        'Heavyweight 300 GSM Tee',
    slug:        'heavyweight-300-gsm-tee',
    description: 'Built for longevity. Our heaviest tee at 300 GSM gives you that solid, structured feel.',
    price:       8499,
    category:    'Classic Tees',
    images:      ['https://images.unsplash.com/photo-1574180566232-aaad1b5b8450?w=600&q=80'],
    colors:      ['black','white','navy','grey','red'],
    sizes:       ['XS','S','M','L','XL','2XL','3XL'],
    features:    ['300 GSM heavyweight','Structured collar','Side seams','Triple stitching'],
    tags:        ['bestseller','premium'],
    stock:       120,
    rating:      4.9,
    reviewCount: 201,
  },
  {
    name:        'Bamboo Eco Tee',
    slug:        'bamboo-eco-tee',
    description: 'Sustainability meets luxury. Made from 70% bamboo viscose and 30% organic cotton.',
    price:       9499,
    category:    'Premium Fitted',
    images:      ['https://images.unsplash.com/photo-1527719327859-c6ce80353573?w=600&q=80'],
    colors:      ['white','grey','green','gold'],
    sizes:       ['XS','S','M','L','XL','2XL'],
    features:    ['70% Bamboo 30% Organic Cotton','Eco-friendly','Ultra-soft','Hypoallergenic'],
    tags:        ['new','eco'],
    stock:       40,
    rating:      4.7,
    reviewCount: 112,
  },
];

const COUPONS = [
  { code:'SHIRT10', discount:10, type:'percentage', usageLimit:500, expiresAt: new Date('2025-12-31') },
  { code:'CRAFT20', discount:20, type:'percentage', usageLimit:200, expiresAt: new Date('2025-08-31'), minOrderValue: 5000 },
  { code:'BULK30',  discount:30, type:'percentage', usageLimit:100, minOrderValue: 20000 },
];

// ── Seed helpers ─────────────────────────────────────────────────
async function ensureDefaultData() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGO_URI);
  }

  const Driver = require('../models/Driver');
  const [adminExists, customerExists, productCount, couponCount, driverCount] = await Promise.all([
    User.findOne({ email: ADMIN.email }),
    User.findOne({ email: CUSTOMER.email }),
    Product.countDocuments(),
    Coupon.countDocuments(),
    Driver.countDocuments(),
  ]);

  if (!adminExists) await User.create(ADMIN);
  if (!customerExists) await User.create(CUSTOMER);
  if (productCount === 0) await Product.insertMany(PRODUCTS);
  if (couponCount === 0) await Coupon.insertMany(COUPONS);
  if (driverCount === 0) await seedDriver();

  return {
    admin: await User.findOne({ email: ADMIN.email }),
    customer: await User.findOne({ email: CUSTOMER.email }),
  };
}

async function seed() {
  console.log('🌱 Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected');

  // Clear existing data
  const Driver = require('../models/Driver');
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    Coupon.deleteMany({}),
    Driver.deleteMany({}),
  ]);
  console.log('🗑️  Cleared existing data');

  // Seed users
  const admin    = await User.create(ADMIN);
  const customer = await User.create(CUSTOMER);
  console.log(`👤 Created users: ${admin.email}, ${customer.email}`);

  // Seed products
  const products = await Product.insertMany(PRODUCTS);
  console.log(`📦 Created ${products.length} products`);

  // Seed coupons
  await Coupon.insertMany(COUPONS);
  console.log(`🏷️  Created ${COUPONS.length} coupons`);

  // Seed a sample order
  await Order.create({
    user:          customer._id,
    items: [{
      product:  products[0]._id,
      name:     products[0].name,
      price:    products[0].price,
      image:    products[0].images[0],
      size:     'L',
      color:    'navy',
      quantity: 2,
    }],
    shipping: {
      name:   'Adaobi Chukwu',
      phone:  '+2348012345678',
      street: '12 Allen Avenue',
      city:   'Lagos',
      state:  'Lagos',
    },
    paymentMethod: 'paystack',
    paymentStatus: 'paid',
    paymentId:     'PSK_DEMO_SEED_001',
    subtotal:      products[0].price * 2,
    discount:      0,
    shippingCost:  0,
    total:         products[0].price * 2,
    status:        'delivered',
    trackingNumber:'SC2025SEED01',
  });
  console.log('📋 Created sample order');

  // Seed a driver
  await seedDriver();

  console.log('\n✨ Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin login:    admin@shirtcraft.com / Admin1234!');
  console.log('Customer login: adaobi@example.com  / Customer123!');
  console.log('Driver login:   emeka.driver@shirtcraft.com / Driver1234!');
  console.log('Coupons:        SHIRT10, CRAFT20, BULK30');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

}

if (require.main === module) {
  seed().catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
}

module.exports = { seed, ensureDefaultData, seedDriver };

// Additional seed step: create a sample driver
async function seedDriver() {
  const Driver = require('../models/Driver');
  await Driver.deleteMany({});
  await Driver.create({
    name:          'Emeka Okonkwo',
    email:         'emeka.driver@shirtcraft.com',
    phone:         '+2348012345678',
    password:      'Driver1234!',
    vehicleType:   'motorcycle',
    vehicleMake:   'Honda',
    vehicleModel:  'CB125F',
    vehiclePlate:  'LAG-123-AB',
    vehicleColor:  'Red',
    licenseNumber: 'NIG-DRV-001234',
    serviceArea:   'Lagos',
    status:        'active',
    totalDeliveries: 47,
    rating:        4.8,
    photo: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=300',
    documents: {
      licenseImage:             'https://images.unsplash.com/photo-1618090584176-7132b9911657?w=500',
      vehicleRegistrationImage: 'https://images.unsplash.com/photo-1618090584176-7132b9911657?w=500',
      insuranceImage:           'https://images.unsplash.com/photo-1618090584176-7132b9911657?w=500',
      insuranceExpiry:          new Date(new Date().getFullYear()+1, 5, 30),
      governmentIdType:         'nin',
      governmentIdImage:        'https://images.unsplash.com/photo-1618090584176-7132b9911657?w=500',
      governmentIdNumber:       '12345678901',
    },
    guarantor: { name: 'Chidi Okonkwo', phone: '+2348023456789', address: 'Ikeja, Lagos', relationship: 'Brother' },
    currentLocation: {
      lat: 6.5244,
      lng: 3.3792,
      address: 'Lagos Island, Lagos',
      lastUpdated: new Date(),
    },
  });
  console.log('🚗 Created sample driver: emeka.driver@shirtcraft.com / +2348012345678');
}

