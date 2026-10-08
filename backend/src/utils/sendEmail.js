const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * sendEmail — sends a transactional email via Resend.
 * @param {string} to      - recipient address
 * @param {string} subject - email subject
 * @param {string} html    - HTML body
 */
async function sendEmail(to, subject, html) {
  await resend.emails.send({
    from: 'When App <onboarding@resend.dev>',
    to,
    subject,
    html,
  });
}

module.exports = sendEmail;
