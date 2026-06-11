// ============================================================
// MediConnect – services/emailService.js
// Nodemailer transactional email service
// ============================================================

const nodemailer = require('nodemailer');
const env = require('../config/env');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

/**
 * Send a transactional email
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plain text fallback
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    const info = await transporter.sendMail({
      from: `"MediConnect" <${env.SMTP_USER}>`,
      to,
      subject,
      html,
      text: text || '',
    });
    console.log('📧 Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email failed:', error.message);
    throw error;
  }
}

/**
 * Send appointment confirmation email
 */
async function sendAppointmentConfirmation({ to, patientName, doctorName, date, time }) {
  return sendEmail({
    to,
    subject: 'Appointment Confirmed – MediConnect',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4E9A97; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">MediConnect</h1>
        </div>
        <div style="padding: 30px; background: #E8F4F1; border-radius: 0 0 8px 8px;">
          <h2 style="color: #3D7F7C;">Appointment Confirmed</h2>
          <p>Hello ${patientName},</p>
          <p>Your appointment has been confirmed:</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p><strong>Doctor:</strong> ${doctorName}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${time}</p>
          </div>
          <p style="color: #718096; font-size: 14px;">If you need to reschedule, please log in to your MediConnect account.</p>
        </div>
      </div>
    `,
  });
}

/**
 * Send password reset email
 */
async function sendPasswordReset({ to, name, resetLink }) {
  return sendEmail({
    to,
    subject: 'Password Reset – MediConnect',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4E9A97; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">MediConnect</h1>
        </div>
        <div style="padding: 30px; background: #E8F4F1; border-radius: 0 0 8px 8px;">
          <h2 style="color: #3D7F7C;">Reset Your Password</h2>
          <p>Hello ${name},</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetLink}" style="background: #4E9A97; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password</a>
          </div>
          <p style="color: #718096; font-size: 14px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
        </div>
      </div>
    `,
  });
}

module.exports = {
  sendEmail,
  sendAppointmentConfirmation,
  sendPasswordReset,
};
