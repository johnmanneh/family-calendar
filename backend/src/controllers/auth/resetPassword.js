const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

// POST /api/auth/reset-password
// Accepts { token, password }.
// Hashes the raw token to find the matching stored digest, then:
//  - Sets the new password
//  - Clears the reset token fields
//  - Increments token_version (migration V011) so all existing JWTs are invalidated
const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return errorResponse(res, 400, 'Token and new password are required');
  }
  if (password.length < 6) {
    return errorResponse(res, 400, 'Password must be at least 6 characters');
  }

  try {
    // Compare digest — never compare raw tokens
    const digest = crypto.createHash('sha256').update(token).digest('hex');

    const userRes = await pool.query(
      `SELECT id FROM users
       WHERE reset_token = $1
         AND reset_token_expires > NOW()`,
      [digest]
    );

    if (!userRes.rows.length) {
      return errorResponse(res, 400, 'Reset link is invalid or has expired');
    }

    const userId       = userRes.rows[0].id;
    const passwordHash = await bcrypt.hash(password, 10);

    // Increment token_version to invalidate all previously issued JWTs for
    // this account. Any session token with a lower version will be rejected
    // by verifyToken on the next request.
    await pool.query(
      `UPDATE users
       SET password            = $1,
           reset_token         = NULL,
           reset_token_expires = NULL,
           token_version       = token_version + 1
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
