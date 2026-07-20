// server/controllers/adminController.js
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');

exports.getStats = async (req, res) => {
  try {
    // Get total revenue from paid orders
    const revenueData = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
    ]);
    const totalRevenue = revenueData[0]?.totalRevenue || 0;

    // Get total orders count
    const totalOrders = await Order.countDocuments();

    // Get total customers (unique users who placed orders)
    const customerData = await Order.distinct('user');
    const totalCustomers = customerData.length;

    // Get top products by revenue
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      { $match: { paymentStatus: 'paid' } },
      { $group: { 
          _id: '$items.name',
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          sales: { $sum: '$items.quantity' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      totalRevenue,
      totalOrders,
      totalCustomers,
      topProducts
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};

exports.getRevenue = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const revenue = await Order.aggregate([
      { 
        $match: { 
          paymentStatus: 'paid',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { 
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          amount: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format for chart - fill in missing months with 0
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const monthName = d.toLocaleString('default', { month: 'short' });
      const monthNum = d.getMonth() + 1;
      const year = d.getFullYear();
      
      const found = revenue.find(r => r._id.month === monthNum && r._id.year === year);
      months.push({
        month: monthName,
        amount: found ? found.amount : 0,
        orders: found ? found.orders : 0
      });
    }

    res.json(months);
  } catch (err) {
    console.error('Revenue error:', err);
    res.status(500).json({ message: 'Failed to fetch revenue data' });
  }
};