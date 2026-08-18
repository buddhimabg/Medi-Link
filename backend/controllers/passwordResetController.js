const bcrypt = require('bcryptjs');
const User = require('../models/user');
const PasswordResetOtp = require('../models/passwordResetOtp');
const { sendEmailNotification } = require('../services/notificationService');

const OTP_TTL_MINUTES = 10;

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// No SMS provider is configured for this project (no Twilio/etc. credentials
// in .env). Real mobile delivery needs one wired in here; until then the OTP
// is logged server-side so the flow can still be exercised in dev.
const sendOtpBySms = async (mobile, otp) => {
  console.log(`[SMS OTP - NOT ACTUALLY SENT, no SMS provider configured] To: ${mobile} | OTP: ${otp}`);
};

const sendOtpByEmail = async (email, otp) => {
  const html = `
    <h2>Password Reset Code</h2>
    <p>Your MediLink password reset code is:</p>
    <h1 style="letter-spacing: 4px;">${otp}</h1>
    <p>This code will expire in ${OTP_TTL_MINUTES} minutes.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;
  try {
    await sendEmailNotification(email, 'Your MediLink Password Reset Code', html);
  } catch (err) {
    // SMTP_USER/SMTP_PASS aren't configured in every environment. Don't let
    // that break the reset flow — log the OTP server-side so it's still
    // testable, same fallback used for the (also unconfigured) SMS channel.
    console.warn(`Email send failed, SMTP likely not configured. [Password reset OTP for ${email}: ${otp}]`, err.message);
  }
};

// POST /api/auth/forgot-password/request-otp
const requestOtp = async (req, res) => {
  try {
    const { identifier, channel } = req.body;
    if (!identifier || !['email', 'mobile'].includes(channel)) {
      return res.status(400).json({ success: false, message: 'A valid email/mobile and channel are required.' });
    }

    const user = channel === 'email'
      ? await User.findOne({ email: identifier.trim().toLowerCase() })
      : await User.findOne({ mobile: identifier.trim() });

    // Always respond the same way whether or not the account exists, so this
    // endpoint can't be used to enumerate registered emails/mobile numbers.
    const genericResponse = {
      success: true,
      message: `If an account matches that ${channel === 'email' ? 'email address' : 'mobile number'}, a verification code has been sent.`,
    };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    // Invalidate any previous unused OTPs for this user+channel before issuing a new one.
    await PasswordResetOtp.updateMany(
      { userId: user._id, channel, consumed: false },
      { $set: { consumed: true } }
    );

    const otp = generateOtp();
    const destination = channel === 'email' ? user.email : user.mobile;

    await PasswordResetOtp.create({
      userId: user._id,
      otp,
      channel,
      destination,
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    });

    if (channel === 'email') {
      await sendOtpByEmail(user.email, otp);
    } else {
      await sendOtpBySms(user.mobile, otp);
    }

    res.status(200).json(genericResponse);
  } catch (error) {
    console.error('requestOtp error:', error);
    res.status(500).json({ success: false, message: 'Server error while sending the verification code.' });
  }
};

// POST /api/auth/forgot-password/reset
const resetPassword = async (req, res) => {
  try {
    const { identifier, channel, otp, newPassword } = req.body;
    if (!identifier || !['email', 'mobile'].includes(channel) || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const user = channel === 'email'
      ? await User.findOne({ email: identifier.trim().toLowerCase() })
      : await User.findOne({ mobile: identifier.trim() });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
    }

    const otpRecord = await PasswordResetOtp.findOne({
      userId: user._id,
      channel,
      otp,
      consumed: false,
    }).sort({ createdAt: -1 });

    if (!otpRecord || otpRecord.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    otpRecord.consumed = true;
    await otpRecord.save();

    res.status(200).json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('resetPassword error:', error);
    res.status(500).json({ success: false, message: 'Server error while resetting the password.' });
  }
};

module.exports = { requestOtp, resetPassword };
