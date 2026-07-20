// server/utils/email.js
const nodemailer = require('nodemailer');

/**
 * sendEmail — send a transactional email via Nodemailer.
 *
 * Supports:
 *   - Gmail SMTP (configure SMTP_USER / SMTP_PASS)
 *   - Any SMTP provider (SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS)
 *   - Ethereal (auto-generated test account when no env vars set)
 *
 * @param {{ to: string, subject: string, html: string, text?: string }} options
 */
exports.sendEmail = async ({ to, subject, html, text }) => {
  try {
    let transporter;

    if (process.env.SMTP_HOST) {
      // ── Custom SMTP (SendGrid, Mailgun, AWS SES, etc.) ─────────
      transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      // ── Gmail ──────────────────────────────────────────────────
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS, // Use App Password for 2FA accounts
        },
      });
    } else {
      // ── Ethereal (development / test) ─────────────────────────
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host:   'smtp.ethereal.email',
        port:   587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const info = await transporter.sendMail({
      from:    process.env.EMAIL_FROM || '"ShirtCraft" <no-reply@shirtcraft.com>',
      to,
      subject,
      text:    text || html.replace(/<[^>]+>/g, ''), // Strip HTML for text fallback
      html,
    });

    // Log preview URL for Ethereal test emails
    if (nodemailer.getTestMessageUrl(info)) {
      console.log('📧 Email preview:', nodemailer.getTestMessageUrl(info));
    }

    return info;
  } catch (err) {
    console.error('Email send error:', err.message);
    // Don't throw — email failures should not break the main request
  }
};

/**
 * Pre-built email templates
 */
exports.templates = {
  orderConfirmation: (order, user) => ({
    subject: `Order Confirmed — ${order.orderNumber}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <div style="background:#FF4F1F;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">Order Confirmed!</h1>
        </div>
        <div style="background:#f9f9f9;padding:24px;border-radius:0 0 12px 12px">
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>Your order <strong style="color:#FF4F1F">${order.orderNumber}</strong> has been confirmed.</p>
          <h3>Items Ordered</h3>
          <table style="width:100%;border-collapse:collapse">
            ${order.items.map(i => `
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #eee">${i.name} (×${i.quantity})</td>
                <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">₦${(i.price * i.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
            <tr>
              <td style="padding:12px 0;font-weight:bold">Total</td>
              <td style="padding:12px 0;text-align:right;font-weight:bold;color:#FF4F1F">₦${order.total.toLocaleString()}</td>
            </tr>
          </table>
          <p style="color:#666;font-size:14px">We'll send you another email when your order ships.</p>
        </div>
      </div>
    `,
  }),

  shippingUpdate: (order) => ({
    subject: `Your order has shipped — ${order.orderNumber}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2>Great news! Your order is on its way 🚚</h2>
        <p>Order: <strong>${order.orderNumber}</strong></p>
        ${order.trackingNumber ? `<p>Tracking Number: <strong>${order.trackingNumber}</strong></p>` : ''}
      </div>
    `,
  }),
};
