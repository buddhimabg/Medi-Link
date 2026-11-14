const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  mobile: { type: String, required: true },
  gender: { type: String, required: true },
  city: { type: String, required: true },
  dob: { type: Date, required: true },
  role: { type: String, default: 'patient' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);