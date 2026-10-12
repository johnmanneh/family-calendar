const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { errorResponse } = require('./response/responseHandlers');

// Cloudinary reads credentials from environment variables:
// CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Keep file in memory — we send it straight to Cloudinary, never touch the disk
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) =>
    ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only image files are allowed'), false),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// Express middleware: reads the `avatar` field, answers with JSON errors
const receiveAvatar = (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return errorResponse(res, 400, 'Photo is too large (max 5 MB)');
    if (err.message === 'Only image files are allowed') return errorResponse(res, 400, 'Please choose a JPG, PNG, WEBP or GIF image');
    console.error('avatar multer error:', err.message);
    return errorResponse(res, 500, 'Could not process the photo');
  });
};

// Upload a photo for a person (user or child profile) → secure URL.
// One file per person (overwrite) so old photos don't accumulate.
function storeAvatar(personId, buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:         'avatars',
        public_id:      `avatar-${personId}`,
        overwrite:      true,
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
      },
      (error, result) => (error ? reject(error) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });
}

// Best effort — used when a child profile is removed
function deleteAvatar(personId) {
  return cloudinary.uploader.destroy(`avatars/avatar-${personId}`).catch(() => {});
}

module.exports = { receiveAvatar, storeAvatar, deleteAvatar };
