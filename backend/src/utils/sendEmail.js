const { Resend } = require('resend');

/**
 * sendEmail — sends a transactional email via Resend.
 * Client is created lazily so a missing RESEND_API_KEY doesn't crash the server on startup.
 * @param {string} to      - recipient address
 * @param {string} subject - email subject
 * @param {string} html    - HTML body
 */
async function sendEmail(to, subject, html) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: 'When App <onboarding@resend.dev>',
    to,
    subject,
    html,
  });
}

module.exports = sendEmail;
