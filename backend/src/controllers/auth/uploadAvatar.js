const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, AVATAR_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${req.user.id}-${Date.now()}${ext}`);
  }
});

// Only allow image files
const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const AVATAR_DIR = path.join(__dirname, '../../../uploads/avatars');
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB max

// Run multer ourselves so its errors come back as JSON the apps can show
// (otherwise Express answers with an HTML error page and the app only sees "failed")
const receiveFile = (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return errorResponse(res, 400, 'Photo is too large (max 5 MB)');
    if (err.message === 'Only image files are allowed') return errorResponse(res, 400, 'Please choose a JPG, PNG, WEBP or GIF image');
    console.error('uploadAvatar multer error:', err.message);
    return errorResponse(res, 500, 'Could not save the photo on the server');
  });
};

const uploadAvatar = [
  receiveFile,
  async (req, res) => {
    if (!req.file) {
      return errorResponse(res, 400, 'No file uploaded');
    }

    const userId = req.user.id;
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    try {
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
