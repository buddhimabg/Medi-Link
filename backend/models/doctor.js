const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gender: { type: String, default: "Not Specified" },
  specialty: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  licenseNumber: { type: String },
  yearsOfExperience: { type: Number, default: 0 },
  qualifications: [{ type: String }],
  languages: [{ type: String }],
  bio: { type: String },
  photo: { type: String }, // Matches your DB screenshot
  imageUrl: { type: String }, // Legacy fallback
  rating: { type: Number, default: 4.5 },
  availableHospitals: [{ type: String }], // Upgraded to an Array of strings!
  hospital: { type: String }, // Legacy fallback
  availableModes: [{ type: String }],
  virtualPrice: { type: Number, required: true },
  physicalPrice: { type: Number, required: true },
  availableSlots: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);