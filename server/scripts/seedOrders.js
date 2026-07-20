// server/scripts/seedOrders.js
const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');
require('dotenv').config();

async function seedOrders() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shirtcraft');
    console.log('✅ Connected to MongoDB');

    // Find or create a user
    let user = await User.findOne({ role: 'customer' });
    
    if (!user) {
      console.log('⚠️ No customer found, creating one...');
      const bcrypt = require('bcryptjs');
      user = await User.create({
        name: 'Test Customer',
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 12),
        role: 'customer',
        isActive: true
      });
      console.log('✅ Created test user:', user.email);
    }

    // Check if orders already exist
    const existingOrders = await Order.countDocuments();
    if (existingOrders > 0) {
      console.log(`⚠️ ${existingOrders} orders already exist. Skipping seed.`);
      console.log('✅ Admin dashboard will show existing orders.');
      process.exit(0);
    }

    // Create 10 test orders with different statuses and dates
    const statuses = ['pending', 'processing', 'shipped', 'delivered'];
    const products = [
      { name: 'Premium Cotton T-Shirt', price: 8500, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=80&q=60' },
      { name: 'Custom Design Hoodie', price: 12500, image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=80&q=60' },
      { name: 'Vintage Logo Tee', price: 6500, image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=80&q=60' },
      { name: 'Premium Polo Shirt', price: 9500, image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=80&q=60' },
      { name: 'Designer Sweatshirt', price: 14500, image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=80&q=60' }
    ];

    const orders = [];
    const now = new Date();

    for (let i = 0; i < 10; i++) {
      const date = new Date();
      // Spread orders over last 6 months
      date.setMonth(now.getMonth() - (i % 6));
      date.setDate(1 + (i * 3) % 28);
      
      // Pick random product
      const product = products[i % products.length];
      const quantity = 1 + (i % 3);
      const subtotal = product.price * quantity;
      const shippingCost = i % 2 === 0 ? 1500 : 0;
      const discount = i % 3 === 0 ? subtotal * 0.1 : 0;
      
      // Generate a fake Paystack reference for paid orders
      const paystackRef = i < 8 ? `PAYSTACK_${Date.now()}_${i}` : null;
      
      orders.push({
        orderNumber: `ORD-2026-${String(i + 1).padStart(4, '0')}`,
        user: user._id,
        items: [{
          product: new mongoose.Types.ObjectId(), // Placeholder product ID
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: quantity,
        }],
        shipping: {
          name: user.name,
          phone: '+2348000000000',
          street: `${123 + i} Test Street`,
          city: ['Lagos', 'Abuja', 'Kano', 'Rivers', 'Oyo'][i % 5],
          state: ['Lagos', 'FCT', 'Kano', 'Rivers', 'Oyo'][i % 5]
        },
        paymentMethod: ['card', 'transfer', 'paypal'][i % 3],
        paymentStatus: i < 8 ? 'paid' : 'pending',
        paymentId: paystackRef, // This preserves the Paystack reference field
        subtotal: subtotal,
        discount: discount,
        shippingCost: shippingCost,
        total: subtotal - discount + shippingCost,
        status: statuses[i % statuses.length],
        createdAt: date,
        // These fields are for Paystack integration
        paymentReference: paystackRef,
        paymentChannel: i % 2 === 0 ? 'card' : 'bank_transfer'
      });
    }

    await Order.insertMany(orders);
    console.log(`✅ Created ${orders.length} test orders!`);
    console.log('💰 Paystack payment references generated for paid orders');
    
    // Show summary
    const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.total : 0), 0);
    console.log(`📊 Total revenue: ₦${totalRevenue.toLocaleString()}`);
    console.log(`📦 Orders by status:`);
    statuses.forEach(s => {
      const count = orders.filter(o => o.status === s).length;
      console.log(`   ${s}: ${count}`);
    });
    console.log(`💳 Paid orders: ${orders.filter(o => o.paymentStatus === 'paid').length}`);
    console.log(`⏳ Pending orders: ${orders.filter(o => o.paymentStatus === 'pending').length}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seedOrders();