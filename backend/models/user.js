const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  gender: { type: String },
  city: { type: String },
  dob: { type: String },
  role: { type: String, default: 'patient' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);