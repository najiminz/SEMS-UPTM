const nodemailer = require('nodemailer');
const { OTP_TTL_MINUTES } = require('./otp');

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

const SUBJECT_BY_PURPOSE = {
  signup: 'Verify your SEMS account',
  password_reset: 'Your SEMS password reset code',
  email_change: 'Confirm your new SEMS email',
};

async function sendOtpEmail(to, code, purpose) {
  await getTransporter().sendMail({
    from: `"SEMS UPTM" <${process.env.GMAIL_USER}>`,
    to,
    subject: SUBJECT_BY_PURPOSE[purpose] || 'Your SEMS verification code',
    text: `Your verification code is: ${code}\n\nThis code expires in ${OTP_TTL_MINUTES} minutes. If you didn't request this, you can safely ignore this email.`,
    html: `
      <p>Your verification code is:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;">${code}</p>
      <p>This code expires in ${OTP_TTL_MINUTES} minutes. If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}

module.exports = { sendOtpEmail };
