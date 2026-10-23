const crypto = require('crypto');
const pool = require('../../config/db');
const sendEmail = require('../../utils/sendEmail');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

// POST /api/auth/forgot-password
// Generates a cryptographically random reset token, stores its SHA-256 digest
// (never the raw token) and emails the raw token to the user as a link.
// Always returns 200 so we don't reveal whether the email exists.
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return errorResponse(res, 400, 'Email is required');

  try {
    const userRes = await pool.query(
      `SELECT id, first_name FROM users WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );

    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];

      // Generate raw token (sent to the user) and store only its SHA-256 digest
      const rawToken = crypto.randomBytes(32).toString('hex');
      const digest   = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expires  = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await pool.query(
        `UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3`,
        [digest, expires, user.id]
      );

      const resetUrl  = `https://its4us.app/reset-password?token=${rawToken}`;
      const firstName = user.first_name || 'there';

      try {
        await sendEmail(
          email.trim(),
          "Reset your it's for us password",
          `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #1a8fa8;">Reset your password</h2>
            <p>Hi ${firstName},</p>
            <p>We received a request to reset the password for your <strong>it's for us</strong> account.</p>
            <p>Click the button below — the link is valid for <strong>1 hour</strong>.</p>
            <a href="${resetUrl}"
               style="display:inline-block;margin:24px 0;padding:14px 28px;background:#1a8fa8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
              Reset password
            </a>
            <p style="color:#888;font-size:13px;">
              If you didn't request this, you can safely ignore this email.
              Your password will not change.
            </p>
            <p style="color:#888;font-size:12px;">— The it's for us team</p>
          </div>
          `
        );
      } catch (emailErr) {
        console.error('forgotPassword email error:', emailErr.message);
      }
    }

    return successResponse(res, 200, 'If that email is registered, a reset link has been sent.');
  } catch (err) {
    console.error('forgotPassword error:', err.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = forgotPassword;
