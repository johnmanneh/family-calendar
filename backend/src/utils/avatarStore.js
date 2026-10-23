const crypto  = require('crypto');
const multer  = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { errorResponse } = require('./response/responseHandlers');

// Cloudinary reads credentials from environment variables:
// CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── HMAC helper ───────────────────────────────────────────────────────────────
// Derive an opaque, stable public_id from personId.  The secret is never
// exposed in URLs so avatar paths can't be enumerated by id-guessing.
function _hmacPublicId(personId) {
  const key = process.env.AVATAR_HMAC_KEY || process.env.CLOUDINARY_API_SECRET;
  if (!key) throw new Error('AVATAR_HMAC_KEY or CLOUDINARY_API_SECRET must be set');
  return crypto.createHmac('sha256', key).update(String(personId)).digest('hex');
}

// ── Multer upload middleware ───────────────────────────────────────────────────
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) =>
    ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only image files are allowed'), false),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
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

// ── Upload ────────────────────────────────────────────────────────────────────
// Stores the image as type 'authenticated' so it never has a guessable URL.
// Face crop is baked in at upload time (400×400) — no on-the-fly transform.
// Returns a time-limited signed download URL (expires in 5 minutes).
function storeAvatar(personId, buffer) {
  return new Promise((resolve, reject) => {
    let publicId;
    try {
      publicId = _hmacPublicId(personId);
    } catch (err) {
      return reject(err);
    }
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:      'avatars',
        public_id:   publicId,
        type:        'authenticated',
        overwrite:   true,
        invalidate:  true,
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
      },
      (error) => {
        if (error) return reject(error);
        const url = cloudinary.utils.private_download_url(
          `avatars/${publicId}`,
          'jpg',
          {
            type:       'authenticated',
            expires_at: Math.floor(Date.now() / 1000) + 300,
            attachment: false,
          }
        );
        resolve(url);
      }
    );
    stream.end(buffer);
  });
}

// ── Signed URL on demand ──────────────────────────────────────────────────────
// Use this to refresh a download URL without re-uploading.
function getAvatarUrl(personId) {
  const publicId = _hmacPublicId(personId);
  return cloudinary.utils.private_download_url(
    `avatars/${publicId}`,
    'jpg',
    {
      type:       'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + 300,
      attachment: false,
    }
  );
}

// ── Delete ────────────────────────────────────────────────────────────────────
// Destroys both the HMAC-keyed asset and the legacy "avatar-N" asset that
// older uploads may have created.  Errors are swallowed (best-effort cleanup).
async function deleteAvatar(personId) {
  const publicId = _hmacPublicId(personId);
  await Promise.allSettled([
    cloudinary.uploader.destroy(`avatars/${publicId}`,    { type: 'authenticated', invalidate: true }),
    cloudinary.uploader.destroy(`avatars/avatar-${personId}`, { invalidate: true }),
  ]);
}

module.exports = { receiveAvatar, storeAvatar, getAvatarUrl, deleteAvatar };
