const jwt  = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

// ── POST /api/auth/register ─────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, age, bloodType } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'name, email, password, role required.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({ name, email, password, role, phone, age, bloodType });

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, email: user.email },
      process.env.JWT_SECRET || 'medilink_secret',
      { expiresIn: '8h' }
    );

    console.log(`✅ Registered: ${email} (${role})`);
    return res.status(201).json({
      success: true,
      data: { token, user: { id: user._id, name: user.name, role: user.role, email: user.email } }
    });
  } catch (error) {
    console.error('❌ register error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ── POST /api/auth/login ────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, email: user.email },
      process.env.JWT_SECRET || 'medilink_secret',
      { expiresIn: '8h' }
    );

    console.log(`✅ Login: ${email} (${user.role})`);
    return res.status(200).json({
      success: true,
      data: { token, user: { id: user._id, name: user.name, role: user.role, email: user.email } }
    });
  } catch (error) {
    console.error('❌ login error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ── GET /api/auth/me ────────────────────────────────────
exports.me = (req, res) => {
  return res.status(200).json({ success: true, data: req.user });
};