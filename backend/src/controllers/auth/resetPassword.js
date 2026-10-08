const bcrypt = require('bcryptjs');
const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

// POST /api/auth/reset-password
// Accepts { token, password } — validates the token and sets a new password.
const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return errorResponse(res, 400, 'Token and new password are required');
  }
  if (password.length < 6) {
    return errorResponse(res, 400, 'Password must be at least 6 characters');
  }

  try {
    const userRes = await pool.query(
      `SELECT id FROM users
       WHERE reset_token = $1
         AND reset_token_expires > NOW()`,
      [token]
    );

    if (userRes.rowCount === 0) {
      return errorResponse(res, 400, 'Reset link is invalid or has expired');
    }

    const userId       = userRes.rows[0].id;
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `UPDATE users
       SET password             = $1,
           reset_token          = NULL,
           reset_token_expires  = NULL
       WHERE id = $2`,
      [passwordHash, userId]
    );

    return successResponse(res, 200, 'Password reset successfully. You can now log in.');
  } catch (err) {
    console.error('resetPassword error:', err.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = resetPassword;
