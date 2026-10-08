const crypto = require('crypto');
const pool = require('../../config/db');
const sendEmail = require('../../utils/sendEmail');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

// POST /api/auth/forgot-password
// Accepts { email }, generates a 1-hour reset token and emails a link.
// Always returns 200 so we don't reveal whether the email exists.
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return errorResponse(res, 400, 'Email is required');

  try {
    const userRes = await pool.query(
      `SELECT id, first_name FROM users WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );

    if (userRes.rowCount > 0) {
      const user = userRes.rows[0];

      // 32-byte hex token — enough entropy to be unguessable
      const token   = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await pool.query(
        `UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3`,
        [token, expires, user.id]
      );

      const resetUrl  = `https://its4us.app/reset-password?token=${token}`;
      const firstName = user.first_name || 'there';

      await sendEmail(
        email.trim(),
        'Reset your When password',
        `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #1a8fa8;">Reset your password</h2>
          <p>Hi ${firstName},</p>
          <p>We received a request to reset the password for your <strong>When</strong> account.</p>
          <p>Click the button below — the link is valid for <strong>1 hour</strong>.</p>
          <a href="${resetUrl}"
             style="display:inline-block;margin:24px 0;padding:14px 28px;background:#1a8fa8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
            Reset password
          </a>
          <p style="color:#888;font-size:13px;">
            If you didn't request this, you can safely ignore this email.
            Your password will not change.
          </p>
          <p style="color:#888;font-size:12px;">— The When team</p>
        </div>
        `
      );
    }

    // Always 200 — don't reveal whether the email exists
    return successResponse(res, 200, 'If that email is registered, a reset link has been sent.');
  } catch (err) {
    console.error('forgotPassword error:', err.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = forgotPassword;
