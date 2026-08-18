const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  doctorName: { type: String, required: true },
  specialty: { type: String, required: true },
  credentials: { type: String },
  type: { type: String, enum: ['Virtual', 'Physical'], required: true },
  imageUrl: { type: String },
  slot: { type: String, required: true },
  hospital: { type: String }, // Only set for Physical appointments
  amount: { type: Number, required: true },
  doctorFee: { type: Number },
  hospitalFee: { type: Number },
  channelingFee: { type: Number },
  noShowRefund: { type: Boolean, default: false },
  noShowFee: { type: Number, default: 0 },
  paymentStatus: { type: String, default: 'Paid' },
  cardHolderName: { type: String },
  cardNumber: { type: String }, // Partial/Masked for records
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
