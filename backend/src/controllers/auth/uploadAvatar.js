const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { receiveAvatar, storeAvatar, getAvatarUrl } = require('../../utils/avatarStore');

const uploadAvatar = [
  receiveAvatar,
  async (req, res) => {
    if (!req.file) return errorResponse(res, 400, 'No file uploaded');
    const userId = req.user.id;
    try {
      await storeAvatar(userId, req.file.buffer);
      await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', ['cloudinary', userId]);
      return successResponse(res, 200, 'Avatar uploaded successfully', { avatar_url: getAvatarUrl(userId) });
    } catch (error) {
      console.error('uploadAvatar error:', error.message);
      return errorResponse(res, 500, 'Failed to save avatar');
    }
  }
];

module.exports = uploadAvatar;
