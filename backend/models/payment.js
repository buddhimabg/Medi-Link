const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  paymentId: { type: String }, // PayHere transaction ID
  amount: { type: Number, required: true },
  currency: { type: String, default: 'LKR' },
  status: { type: String, required: true, default: 'Pending' },
  refundAmount: { type: Number }, // Actual amount credited back on a 'Refunded' cancellation
  method: { type: String }, // Visa, Mastercard, etc.
  cardHolderName: { type: String },
  cardMasked: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
