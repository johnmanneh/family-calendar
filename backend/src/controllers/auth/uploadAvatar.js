const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

// Cloudinary reads credentials from environment variables:
// CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Keep file in memory — we send it straight to Cloudinary, never touch the disk
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB max

const receiveFile = (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return errorResponse(res, 400, 'Photo is too large (max 5 MB)');
    if (err.message === 'Only image files are allowed') return errorResponse(res, 400, 'Please choose a JPG, PNG, WEBP or GIF image');
    console.error('uploadAvatar multer error:', err.message);
    return errorResponse(res, 500, 'Could not process the photo');
  });
};

const uploadAvatar = [
  receiveFile,
  async (req, res) => {
    if (!req.file) {
      return errorResponse(res, 400, 'No file uploaded');
    }

    const userId = req.user.id;

    try {
      // Upload buffer to Cloudinary — store under avatars/avatar-{userId}
      // overwrite: true replaces the previous photo so old files don't accumulate
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder:         'avatars',
            public_id:      `avatar-${userId}`,
            overwrite:      true,
            transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      const avatarUrl = result.secure_url;

      await pool.query(
        'UPDATE users SET avatar_url = $1 WHERE id = $2',
        [avatarUrl, userId]
      );

      return successResponse(res, 200, 'Avatar uploaded successfully', { avatar_url: avatarUrl });
    } catch (error) {
      console.error('uploadAvatar error:', error.message);
      return errorResponse(res, 500, 'Failed to save avatar');
    }
  }
];

module.exports = uploadAvatar;
