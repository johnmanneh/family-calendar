const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * sendEmail — sends a transactional email via Gmail SMTP.
 * @param {string} to      - recipient address
 * @param {string} subject - email subject
 * @param {string} html    - HTML body
 */
async function sendEmail(to, subject, html) {
  await transporter.sendMail({
    from: `"When App" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

module.exports = sendEmail;
