// src/services/emailService.js
//
// Real email delivery via Gmail SMTP using Nodemailer.
//
// SETUP REQUIRED (do this before OTP emails will actually send):
// 1. Go to your Google Account -> Security -> 2-Step Verification -> App Passwords
//    (2-Step Verification must be ON first, otherwise "App Passwords" won't show up)
// 2. Generate a 16-character App Password for "Mail"
// 3. Add these two lines to your .env file:
//      GMAIL_USER=youraddress@gmail.com
//      GMAIL_APP_PASSWORD=your16charapppassword   (no spaces)
//
// Do NOT use your normal Gmail login password here — Google blocks that
// for SMTP. It must be an App Password.

const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error(
      'GMAIL_USER and GMAIL_APP_PASSWORD must be set in .env before emails can be sent. ' +
      'See src/services/emailService.js header comment for setup steps.'
    );
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  return transporter;
}

async function sendOtpEmail(email, code, expiryMinutes) {
  const mailOptions = {
    from: `"DigiiCare" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Your DigiiCare Login OTP',
    text: `Your DigiiCare login OTP is ${code}. Valid for ${expiryMinutes} minute(s). Do not share this code with anyone.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color:#1a73e8;">DigiiCare Login OTP</h2>
        <p>Your one-time password (OTP) is:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p>
        <p>This code is valid for <b>${expiryMinutes} minute(s)</b>.</p>
        <p style="color:#888; font-size: 12px;">Do not share this code with anyone. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log(`[EMAIL] OTP sent to ${email} | messageId: ${info.messageId}`);
    return { success: true, provider: 'gmail-smtp', messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL] Failed to send OTP to ${email}:`, err.message);
    throw err;
  }
}

module.exports = { sendOtpEmail };
