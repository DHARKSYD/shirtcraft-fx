// server/routes/drivers.js
const express = require('express');
const router  = express.Router();
const Driver  = require('../models/Driver');
const Order   = require('../models/Order');
const { protect, adminOnly, protectDriver } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const { getIO } = require('../config/socket');
const { getAllowedOrigins } = require('../utils/corsOrigins');

// Fields a driver may propose changes to. Kept explicit and separate from
// the admin PUT /:id route (which accepts any field) so a driver can never
// self-approve a status or activeOrder change by shaping their own body.
const ALLOWED_SELF_UPDATE_FIELDS = ['name', 'phone', 'vehicleMake', 'vehicleModel', 'vehiclePlate', 'vehicleColor', 'serviceArea'];

// ── PUBLIC: Driver self-registration ──────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const {
      name, email, phone, password, vehicleType, vehicleMake, vehicleModel,
      vehiclePlate, vehicleColor, licenseNumber, licenseExpiry, serviceArea,
      photo, documents, guarantor,
    } = req.body;

    if (!name || !email || !phone || !password || !vehiclePlate || !licenseNumber) {
      return res.status(400).json({ message: 'All required fields must be filled.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
    // Verification documents are required up front rather than collected
    // later — an application that's missing them can't usefully be
    // reviewed, and this was the whole point of the "confidential and
    // professional documents" gap being flagged.
    const requiredDocs = ['licenseImage', 'vehicleRegistrationImage', 'insuranceImage', 'governmentIdImage', 'governmentIdType'];
    const missingDocs  = requiredDocs.filter(f => !documents?.[f]);
    if (missingDocs.length) {
      return res.status(400).json({ message: 'Please upload all required documents before submitting.' });
    }
    if (!guarantor?.name || !guarantor?.phone) {
      return res.status(400).json({ message: 'Guarantor name and phone number are required.' });
    }

    const driver = await Driver.create({
      name, email: email.toLowerCase(), phone, password,
      vehicleType: vehicleType || 'motorcycle',
      vehicleMake, vehicleModel, vehiclePlate, vehicleColor,
      licenseNumber,
      licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
      serviceArea: serviceArea || 'Lagos',
      photo: photo || null,
      documents,
      guarantor,
      status: 'pending',
    });

    sendEmail({
      to:      process.env.ADMIN_EMAIL || process.env.GMAIL_USER,
      subject: 'New Driver Registration — ShirtCraft',
      html:    `<h2>New driver application received</h2><p><strong>${driver.name}</strong> (${driver.email}) applied to be a delivery driver. <a href="${getAllowedOrigins()[0]}/admin/drivers">Review application →</a></p>`,
    }).catch(console.error);

    res.status(201).json({
      message: 'Application submitted! You will receive an email once approved.',
      driverId: driver._id,
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || 'value';
      const labels = { email: 'email address', phone: 'phone number', vehiclePlate: 'plate number', licenseNumber: 'license number' };
      return res.status(409).json({
        message: `That ${labels[field] || field} is already registered to another driver.`,
        field,
      });
    }
    if (err.name === 'ValidationError') {
      const first = Object.values(err.errors)[0];
      return res.status(400).json({ message: first?.message || 'Please check your details and try again.' });
    }
    console.error('Driver register error:', err);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

// ── DRIVER: Login with email + password ────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    const driver = await Driver.findOne({ email: email.toLowerCase() }).select('+password');
    if (!driver || !(await driver.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials.' });
    if (driver.status === 'pending')
      return res.status(403).json({ message: 'Your application is still pending approval.' });
    if (driver.status === 'suspended')
      return res.status(403).json({ message: 'Your account has been suspended. Contact support.' });

    // The scoped { driverId } claim (not middleware/auth's generateToken,
    // which signs { id }) is what protectDriver specifically looks for, so
    // a driver token can never be mistaken for a customer/admin one.
    const jwt = require('jsonwebtoken');
    const scopedToken = jwt.sign(
      { driverId: driver._id },
      process.env.JWT_SECRET || 'shirtcraft_secret_2025',
      { expiresIn: '24h' }
    );

    // Populate the active order so the dashboard has real shipping/total
    // data to render immediately, rather than a bare ObjectId string.
    const populated = await Driver.findById(driver._id)
      .populate('activeOrder', 'orderNumber status shipping items total');

    res.json({ token: scopedToken, driver: populated });
  } catch (err) { console.error('Driver login error:', err); res.status(500).json({ message: 'Login failed.' }); }
});

// ── DRIVER: Own delivery/order history ─────────────────────────────
// Every order this driver has ever been assigned to, most recent first —
// the dashboard previously had no way to show this at all. Registered
// before /me/:driverId below, since that wildcard route would otherwise
// match /me/orders first and treat "orders" as a driver id.
router.get('/me/orders', protectDriver, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const query = { assignedDriver: req.driver._id };
    const total  = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .select('orderNumber status paymentStatus shipping items total createdAt trackingNumber')
      .sort({ createdAt: -1 })
      .skip((Number(page)-1) * Number(limit))
      .limit(Number(limit));
    res.json({ orders, total, pages: Math.ceil(total / Number(limit)) });
  } catch (err) { res.status(500).json({ message: 'Failed to fetch order history.' }); }
});

// ── DRIVER: Get own profile + active order (auth required) ────────
router.get('/me/:driverId', protectDriver, async (req, res) => {
  try {
    // req.driver is the authenticated driver — the :driverId param is only
    // honoured when it matches, so one driver's token can never be used to
    // read another driver's profile.
    if (String(req.driver._id) !== req.params.driverId) {
      return res.status(403).json({ message: 'You can only view your own profile.' });
    }
    const driver = await Driver.findById(req.driver._id)
      .populate('activeOrder', 'orderNumber status shipping items total');
    res.json(driver);
  } catch (err) { res.status(500).json({ message: 'Failed to fetch driver profile.' }); }
});

// ── DRIVER: Sync own online/offline status ─────────────────────────
// Split out from the admin PUT /:id route (which the driver client has no
// credentials for) so "Go Online" actually persists to the database.
router.put('/me/status', protectDriver, async (req, res) => {
  try {
    const { isOnline } = req.body;
    const driver = await Driver.findByIdAndUpdate(
      req.driver._id, { isOnline: !!isOnline }, { new: true }
    );
    res.json({ isOnline: driver.isOnline });
  } catch (err) { res.status(500).json({ message: 'Failed to update status.' }); }
});

// ── DRIVER: Submit a profile-detail change for admin approval ─────
router.put('/me/request-update', protectDriver, async (req, res) => {
  try {
    const changes = {};
    ALLOWED_SELF_UPDATE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== '') changes[field] = req.body[field];
    });
    if (Object.keys(changes).length === 0) {
      return res.status(400).json({ message: 'No valid fields submitted.' });
    }

    const driver = await Driver.findByIdAndUpdate(
      req.driver._id,
      { pendingUpdate: changes, pendingUpdateSubmittedAt: new Date() },
      { new: true }
    );

    sendEmail({
      to:      process.env.ADMIN_EMAIL || process.env.GMAIL_USER,
      subject: `Driver profile update pending — ${driver.name}`,
      html:    `<p><strong>${driver.name}</strong> requested a profile change. <a href="${getAllowedOrigins()[0]}/admin/drivers">Review in the admin panel →</a></p>`,
    }).catch(console.error);

    res.json({ message: 'Update submitted for admin approval.', driver });
  } catch (err) { res.status(500).json({ message: 'Failed to submit update.' }); }
});

// ── ADMIN: Get all drivers ─────────────────────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search = '' } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) query.$or = [
      { name:  { $regex: search, $options:'i' } },
      { email: { $regex: search, $options:'i' } },
      { vehiclePlate: { $regex: search, $options:'i' } },
    ];

    const total   = await Driver.countDocuments(query);
    const drivers = await Driver.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page)-1) * Number(limit))
      .limit(Number(limit))
      .populate('activeOrder', 'orderNumber status');

    res.json({ drivers, total, pages: Math.ceil(total/Number(limit)) });
  } catch (err) { res.status(500).json({ message: 'Failed to fetch drivers.' }); }
});

// ── ADMIN: Get all ACTIVE drivers with locations (for live map) ───
router.get('/live', protect, adminOnly, async (req, res) => {
  try {
    const drivers = await Driver.find({ status:'active', isOnline: true })
      .select('name phone vehicleType vehiclePlate currentLocation isOnline activeOrder status')
      .populate('activeOrder', 'orderNumber shipping.city shipping.street');
    res.json(drivers);
  } catch (err) { res.status(500).json({ message: 'Failed to fetch live drivers.' }); }
});

// ── ADMIN: Get all pending driver profile-update requests ─────────
router.get('/pending-updates', protect, adminOnly, async (req, res) => {
  try {
    const drivers = await Driver.find({ pendingUpdate: { $ne: null } })
      .select('name email phone vehicleMake vehicleModel vehiclePlate vehicleColor serviceArea pendingUpdate pendingUpdateSubmittedAt');
    res.json(drivers);
  } catch (err) { res.status(500).json({ message: 'Failed to fetch pending updates.' }); }
});

// ── ADMIN: Get single driver ──────────────────────────────────────
router.get('/:id', protect, adminOnly, async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
      .populate('activeOrder', 'orderNumber status shipping items total');
    if (!driver) return res.status(404).json({ message: 'Driver not found.' });
    res.json(driver);
  } catch (err) { res.status(500).json({ message: 'Failed to fetch driver.' }); }
});

// ── ADMIN: Update driver status / details ─────────────────────────
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const before = await Driver.findById(req.params.id);
    if (!before) return res.status(404).json({ message: 'Driver not found.' });
    const wasApproved = ['approved', 'active'].includes(before.status);

    const driver = await Driver.findByIdAndUpdate(
      req.params.id, { $set: req.body }, { new: true, runValidators: true }
    );

    // Covers the admin picking 'active' directly as well as 'approved' —
    // either one means "this application just got approved" from the
    // driver's point of view, and previously only the literal string
    // 'approved' triggered the email, so jumping straight to 'active' sent
    // nothing.
    const nowApproved = ['approved', 'active'].includes(driver.status);
    if (!wasApproved && nowApproved) {
      sendEmail({
        to:      driver.email,
        subject: 'ShirtCraft — Your driver application is approved! 🎉',
        html:    `
          <h2>Congratulations ${driver.name}!</h2>
          <p>Your application to become a ShirtCraft delivery driver has been approved.</p>
          <p>You can now log into the ShirtCraft Driver App to start accepting deliveries.</p>
          <p>Log in with the email and password you registered with: <a href="${getAllowedOrigins()[0]}/driver/login">${getAllowedOrigins()[0]}/driver/login</a></p>
        `,
      }).catch(console.error);
    }

    res.json(driver);
  } catch (err) { res.status(500).json({ message: 'Update failed.', error: err.message }); }
});

// ── ADMIN: Approve or reject a pending driver profile-update ──────
router.put('/:id/review-update', protect, adminOnly, async (req, res) => {
  try {
    const { approve } = req.body; // boolean
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Driver not found.' });
    if (!driver.pendingUpdate) return res.status(400).json({ message: 'No pending update for this driver.' });

    if (approve) {
      Object.assign(driver, driver.pendingUpdate);
    }
    driver.pendingUpdate = null;
    driver.pendingUpdateSubmittedAt = null;
    await driver.save();

    const io = getIO();
    if (io && driver.socketId) {
      io.of('/driver').to(driver.socketId).emit('profile:reviewed', { approved: !!approve });
    }

    res.json({ message: approve ? 'Update approved.' : 'Update rejected.', driver });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || 'value';
      const labels = { phone: 'phone number', vehiclePlate: 'plate number', licenseNumber: 'license number', email: 'email address' };
      return res.status(409).json({ message: `Can't approve — that ${labels[field] || field} is already registered to another driver.` });
    }
    res.status(500).json({ message: 'Review failed.' });
  }
});

// ── ADMIN: Assign driver to order ─────────────────────────────────
router.post('/:driverId/assign/:orderId', protect, adminOnly, async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found.' });
    if (driver.status !== 'active') return res.status(400).json({ message: 'Driver is not active.' });

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    // Assign
    await Driver.findByIdAndUpdate(req.params.driverId, { activeOrder: order._id });
    const updatedOrder = await Order.findByIdAndUpdate(req.params.orderId, {
      status:        'processing',
      assignedDriver: driver._id,
      trackingNumber: `SC-DRV-${driver.vehiclePlate}`,
    }, { new: true });

    // Push the assignment straight to the driver if they're currently
    // connected — this is the piece that was missing: the database updated
    // correctly, but nothing ever told the driver's own socket about it, so
    // the delivery only ever appeared after a manual profile refetch.
    const io = getIO();
    if (io && driver.socketId) {
      io.of('/driver').to(driver.socketId).emit('order:assigned', { order: updatedOrder });
    }

    // Notify customer
    if (order.user) {
      const User = require('../models/User');
      const customer = await User.findById(order.user);
      if (customer) {
        sendEmail({
          to:      customer.email,
          subject: `Your ShirtCraft order is on its way! — ${order.orderNumber}`,
          html:    `
            <h2>Your order is with a driver! 🚗</h2>
            <p>Order <strong>${order.orderNumber}</strong> has been assigned to <strong>${driver.name}</strong>.</p>
            <p>Vehicle: ${driver.vehicleType} · ${driver.vehiclePlate}</p>
            <p><a href="${getAllowedOrigins()[0]}/track/${order._id}">Track your delivery in real time →</a></p>
          `,
        }).catch(console.error);
      }
    }

    res.json({ message: 'Driver assigned!', driver, order: updatedOrder });
  } catch (err) { res.status(500).json({ message: 'Assignment failed.' }); }
});

// ── ADMIN: Unassign driver from order ────────────────────────────
router.delete('/:driverId/assign', protect, adminOnly, async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.driverId);
    if (driver?.activeOrder) {
      await Order.findByIdAndUpdate(driver.activeOrder, { assignedDriver: null });
    }
    await Driver.findByIdAndUpdate(req.params.driverId, { activeOrder: null });

    const io = getIO();
    if (io && driver?.socketId) {
      io.of('/driver').to(driver.socketId).emit('order:unassigned', {});
    }

    res.json({ message: 'Driver unassigned.' });
  } catch (err) { res.status(500).json({ message: 'Unassign failed.' }); }
});

// ── ADMIN: Delete driver ──────────────────────────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Driver.findByIdAndDelete(req.params.id);
    res.json({ message: 'Driver deleted.' });
  } catch (err) { res.status(500).json({ message: 'Delete failed.' }); }
});

module.exports = router;
