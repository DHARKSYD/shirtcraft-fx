// server/config/socket.js
const { Server } = require('socket.io');
const Driver     = require('../models/Driver');
const jwt        = require('jsonwebtoken');
const { corsOriginCheck } = require('../utils/corsOrigins');
const { sendEmail } = require('../utils/email');

let ioInstance = null;

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin:      corsOriginCheck,
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  ioInstance = io;

  // ── Namespaces ─────────────────────────────────────────────────
  const trackingNS = io.of('/tracking'); // customers + admin watching
  const driverNS   = io.of('/driver');   // drivers sending location

  // ── Driver namespace ───────────────────────────────────────────
  driverNS.use(async (socket, next) => {
    // Validate driver via token in handshake
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token provided'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'shirtcraft_secret_2025');
      socket.driverId = decoded.driverId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  driverNS.on('connection', async (socket) => {
    console.log(`🚗 Driver connected: ${socket.driverId}`);

    // Mark driver as online
    try {
      await Driver.findByIdAndUpdate(socket.driverId, {
        isOnline: true,
        socketId: socket.id,
      });
    } catch (err) { console.error('Driver connect DB error:', err); }

    // Driver sends location update
    socket.on('location:update', async (data) => {
      // data: { lat, lng, bearing, speed, address }
      try {
        const driver = await Driver.findByIdAndUpdate(
          socket.driverId,
          {
            'currentLocation.lat':         data.lat,
            'currentLocation.lng':         data.lng,
            'currentLocation.bearing':     data.bearing || 0,
            'currentLocation.speed':       data.speed   || 0,
            'currentLocation.address':     data.address || null,
            'currentLocation.lastUpdated': new Date(),
          },
          { new: true }
        ).select('name vehicleType vehiclePlate currentLocation activeOrder status');

        if (driver) {
          // Broadcast to all watchers in tracking namespace
          trackingNS.emit('driver:location', {
            driverId:    driver._id,
            name:        driver.name,
            vehicleType: driver.vehicleType,
            vehiclePlate:driver.vehiclePlate,
            location:    driver.currentLocation,
            activeOrder: driver.activeOrder,
            status:      driver.status,
          });

          // Broadcast to customers watching this specific driver
          if (driver.activeOrder) {
            trackingNS.to(`order:${driver.activeOrder}`).emit('driver:location', {
              driverId: driver._id,
              location: driver.currentLocation,
            });
          }
        }
      } catch (err) { console.error('Location update error:', err); }
    });

    // Driver marks delivery as picked up
    socket.on('delivery:pickedup', async ({ orderId }) => {
      try {
        const Order = require('../models/Order');
        await Order.findByIdAndUpdate(orderId, { status: 'shipped' });
        trackingNS.to(`order:${orderId}`).emit('delivery:pickedup', { orderId });
        trackingNS.emit('order:status', { orderId, status: 'shipped' });
      } catch (err) { console.error('Pickup error:', err); }
    });

    // Driver marks delivery as completed
    socket.on('delivery:completed', async ({ orderId }) => {
      try {
        const Order = require('../models/Order');
        const order = await Order.findByIdAndUpdate(orderId, { status: 'delivered' }, { new: true })
          .populate('user', 'name email');
        await Driver.findByIdAndUpdate(socket.driverId, {
          activeOrder: null,
          $inc: { totalDeliveries: 1 },
        });
        trackingNS.to(`order:${orderId}`).emit('delivery:completed', { orderId });
        trackingNS.emit('order:status', { orderId, status: 'delivered' });

        if (order?.user?.email) {
          sendEmail({
            to:      order.user.email,
            subject: `Delivered! — ${order.orderNumber}`,
            html: `
              <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
                <h2 style="color:#FF4F1F">Your order has arrived 📦</h2>
                <p>Hi ${order.user.name || 'there'},</p>
                <p>Order <strong>${order.orderNumber}</strong> was just marked delivered by your driver. We hope you love it!</p>
                <p>If anything's not right, just reply to this email and we'll sort it out.</p>
              </div>
            `,
          }).catch(err => console.error('Delivery email failed:', err.message));
        }
      } catch (err) { console.error('Completion error:', err); }
    });

    // Driver goes offline
    socket.on('disconnect', async () => {
      console.log(`🚗 Driver disconnected: ${socket.driverId}`);
      try {
        await Driver.findByIdAndUpdate(socket.driverId, {
          isOnline: false,
          socketId: null,
        });
        trackingNS.emit('driver:offline', { driverId: socket.driverId });
      } catch (err) { console.error('Driver disconnect error:', err); }
    });
  });

  // ── Tracking namespace (customers + admin) ─────────────────────
  trackingNS.on('connection', (socket) => {
    // Customer joins room for their specific order
    socket.on('watch:order', (orderId) => {
      socket.join(`order:${orderId}`);
    });

    socket.on('unwatch:order', (orderId) => {
      socket.leave(`order:${orderId}`);
    });
  });

  console.log('✅ Socket.io initialised');
  return io;
}

// Helper to get io instance from anywhere
function getIO() { return ioInstance; }

module.exports = { initSocket, getIO };
