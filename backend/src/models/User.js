// backend/src/models/User.js
const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['patient', 'doctor'], required: true },
  phone:    { type: String, default: '' },
  // Patient-only fields
  age:       { type: Number, default: null },
  bloodType: { type: String, default: '' },
}, { timestamps: true });

// Password save වෙන්න කලින් hash කරනවා
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model('User', userSchema);

