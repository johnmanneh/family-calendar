const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { receiveAvatar, saveAvatar } = require('../../utils/avatarStore');

const uploadAvatar = [
  receiveAvatar,
  async (req, res) => {
    if (!req.file) return errorResponse(res, 400, 'No file uploaded');
    const userId = req.user.id;
    try {
      // marker carries the upload version → a new URL per upload (no stale cached photo)
      const { url, marker } = await saveAvatar(userId, req.file.buffer);
      await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [marker, userId]);
      return successResponse(res, 200, 'Avatar uploaded successfully', { avatar_url: url });
    } catch (error) {
      console.error('uploadAvatar error:', error.message);
      return errorResponse(res, 500, 'Failed to save avatar');
    }
  }
];

module.exports = uploadAvatar;
