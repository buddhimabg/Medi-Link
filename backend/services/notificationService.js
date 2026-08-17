const nodemailer = require('nodemailer');
const { logger } = require('../middleware/logger');

/**
 * Notification Service
 * Handles email and SMS notifications
 */

// Initialize email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send email notification
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @returns {Promise<void>}
 */
exports.sendEmailNotification = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@medilink.com',
      to,
      subject,
      html
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully`, { to, subject });
  } catch (error) {
    logger.error(`Send email notification error: ${error.message}`);
    throw error;
  }
};

/**
 * Send appointment reminder
 * @param {string} patientEmail - Patient email
 * @param {string} doctorName - Doctor name
 * @param {Date} appointmentDate - Appointment date
 * @param {string} startTime - Start time
 * @returns {Promise<void>}
 */
exports.sendAppointmentReminder = async (patientEmail, doctorName, appointmentDate, startTime) => {
  try {
    const html = `
      <h2>Appointment Reminder</h2>
      <p>Dear Patient,</p>
      <p>This is a reminder about your upcoming appointment:</p>
      <ul>
        <li><strong>Doctor:</strong> ${doctorName}</li>
        <li><strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString()}</li>
        <li><strong>Time:</strong> ${startTime}</li>
      </ul>
      <p>Please arrive 10 minutes early.</p>
      <p>Best regards,<br>Medi-Link Team</p>
    `;

    await exports.sendEmailNotification(patientEmail, 'Appointment Reminder', html);
  } catch (error) {
    logger.error(`Send appointment reminder error: ${error.message}`);
    throw error;
  }
};

/**
 * Send appointment confirmation
 * @param {string} patientEmail - Patient email
 * @param {string} doctorName - Doctor name
 * @param {Date} appointmentDate - Appointment date
 * @param {string} startTime - Start time
 * @returns {Promise<void>}
 */
exports.sendAppointmentConfirmation = async (patientEmail, doctorName, appointmentDate, startTime) => {
  try {
    const html = `
      <h2>Appointment Confirmed</h2>
      <p>Dear Patient,</p>
      <p>Your appointment has been successfully booked:</p>
      <ul>
        <li><strong>Doctor:</strong> ${doctorName}</li>
        <li><strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString()}</li>
        <li><strong>Time:</strong> ${startTime}</li>
      </ul>
      <p>Thank you for choosing Medi-Link!</p>
      <p>Best regards,<br>Medi-Link Team</p>
    `;

    await exports.sendEmailNotification(patientEmail, 'Appointment Confirmed', html);
  } catch (error) {
    logger.error(`Send appointment confirmation error: ${error.message}`);
    throw error;
  }
};

/**
 * Send appointment cancellation
 * @param {string} patientEmail - Patient email
 * @param {string} doctorName - Doctor name
 * @param {Date} appointmentDate - Appointment date
 * @returns {Promise<void>}
 */
exports.sendAppointmentCancellation = async (patientEmail, doctorName, appointmentDate) => {
  try {
    const html = `
      <h2>Appointment Cancelled</h2>
      <p>Dear Patient,</p>
      <p>Your appointment with Dr. ${doctorName} on ${new Date(appointmentDate).toLocaleDateString()} has been cancelled.</p>
      <p>If you need to reschedule, please contact us.</p>
      <p>Best regards,<br>Medi-Link Team</p>
    `;

    await exports.sendEmailNotification(patientEmail, 'Appointment Cancelled', html);
  } catch (error) {
    logger.error(`Send appointment cancellation error: ${error.message}`);
    throw error;
  }
};

/**
 * Send welcome email
 * @param {string} email - User email
 * @param {string} name - User name
 * @returns {Promise<void>}
 */
exports.sendWelcomeEmail = async (email, name) => {
  try {
    const html = `
      <h2>Welcome to Medi-Link!</h2>
      <p>Dear ${name},</p>
      <p>Thank you for registering with Medi-Link Medical Management System.</p>
      <p>You can now:</p>
      <ul>
        <li>Schedule appointments with our doctors</li>
        <li>View your medical history</li>
        <li>Manage your prescriptions</li>
        <li>Receive health reminders</li>
      </ul>
      <p>Best regards,<br>Medi-Link Team</p>
    `;

    await exports.sendEmailNotification(email, 'Welcome to Medi-Link', html);
  } catch (error) {
    logger.error(`Send welcome email error: ${error.message}`);
    throw error;
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {string} resetLink - Password reset link
 * @returns {Promise<void>}
 */
exports.sendPasswordResetEmail = async (email, resetLink) => {
  try {
    const html = `
      <h2>Password Reset Request</h2>
      <p>Dear User,</p>
      <p>You have requested to reset your password. Click the link below to proceed:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>Medi-Link Team</p>
    `;

    await exports.sendEmailNotification(email, 'Password Reset Request', html);
  } catch (error) {
    logger.error(`Send password reset email error: ${error.message}`);
    throw error;
  }
};

/**
 * Send prescription ready notification
 * @param {string} patientEmail - Patient email
 * @param {string} prescriptionName - Prescription name
 * @returns {Promise<void>}
 */
exports.sendPrescriptionReadyNotification = async (patientEmail, prescriptionName) => {
  try {
    const html = `
      <h2>Prescription Ready</h2>
      <p>Dear Patient,</p>
      <p>Your prescription "${prescriptionName}" is now ready for pickup at our pharmacy.</p>
      <p>Please bring your ID and appointment confirmation.</p>
      <p>Best regards,<br>Medi-Link Team</p>
    `;

    await exports.sendEmailNotification(patientEmail, 'Prescription Ready', html);
  } catch (error) {
    logger.error(`Send prescription ready notification error: ${error.message}`);
    throw error;
  }
};

/**
 * Test email connection
 * @returns {Promise<boolean>} True if connection successful
 */
exports.testEmailConnection = async () => {
  try {
    await transporter.verify();
    logger.info(`Email service connection verified`);
    return true;
  } catch (error) {
    logger.error(`Email service connection failed: ${error.message}`);
    return false;
  }
};