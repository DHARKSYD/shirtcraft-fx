// server/routes/uploads.js
const express    = require('express');
const multer     = require('multer');
const { protect } = require('../middleware/auth');
const router     = express.Router();

// Store in memory, then send to Cloudinary
const storage = multer.memoryStorage();
const upload  = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type.'));
  },
});

// Shared by both routes below so the "no Cloudinary configured → demo
// placeholder" fallback and the real upload path only exist in one place.
async function uploadToCloudinary(file, folder) {
  let cloudinary;
  try { cloudinary = require('cloudinary').v2; } catch {}

  if (!cloudinary || !process.env.CLOUDINARY_CLOUD_NAME) {
    // Demo mode: return a placeholder URL
    return {
      url:      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600',
      publicId: 'demo_upload',
      demo:     true,
    };
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const b64     = Buffer.from(file.buffer).toString('base64');
  const dataURI = `data:${file.mimetype};base64,${b64}`;

  const result = await cloudinary.uploader.upload(dataURI, {
    folder,
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  });

  return { url: result.secure_url, publicId: result.public_id, demo: false };
}

// POST /api/uploads/image — general-purpose, requires a logged-in user
// (product photos, avatars, custom-design uploads, etc).
router.post('/image', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const result = await uploadToCloudinary(req.file, 'shirtcraft');
    res.json(result.demo
      ? { ...result, message: 'Demo mode: configure Cloudinary for real uploads.' }
      : result);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: err.message || 'Upload failed.' });
  }
});

// POST /api/uploads/driver-document — deliberately NOT behind `protect`.
// A driver applicant doesn't have any credentials yet at the point they're
// uploading their license/insurance/ID during registration — that's the
// whole chicken-and-egg problem this route exists to solve. It's still not
// wide open: it's covered by the same tight rate limiter as
// /api/drivers/register in index.js (20 requests/15min per IP), and only
// accepts image files up to 5MB like every other upload here.
router.post('/driver-document', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const result = await uploadToCloudinary(req.file, 'shirtcraft/driver-documents');
    res.json(result.demo
      ? { ...result, message: 'Demo mode: configure Cloudinary for real uploads.' }
      : result);
  } catch (err) {
    console.error('Driver document upload error:', err);
    res.status(500).json({ message: err.message || 'Upload failed.' });
  }
});

// DELETE /api/uploads/:publicId
router.delete('/:publicId', protect, async (req, res) => {
  try {
    let cloudinary;
    try { cloudinary = require('cloudinary').v2; } catch {}
    if (!cloudinary) return res.json({ message: 'Demo mode.' });

    await cloudinary.uploader.destroy(req.params.publicId);
    res.json({ message: 'Image deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Delete failed.' });
  }
});

module.exports = router;
