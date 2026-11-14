const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  // ── Booking/payment-flow fields (patient booking a doctor slot) ──
  userId: { type: String, index: true },
  doctorId: { type: mongoose.Schema.Types.Mixed, required: true, index: true }, // ObjectId ref 'Doctor' (booking flow) OR the doctor's User _id (video-call queue flow) — two features use different ID spaces, so this is left flexible rather than a strict ref.
  doctorName: { type: String },
  specialty: { type: String },
  credentials: { type: String },
  type: { type: String, enum: ['Virtual', 'Physical'] },
  imageUrl: { type: String },
  // Not required at the schema level — dilshari's video-call queue flow
  // creates appointments before a slot/amount is known; the booking flow
  // (bookAppointment.tsx) always supplies both when creating a real booking.
  slot: { type: String },
  hospital: { type: String }, // Only set for Physical appointments
  amount: { type: Number },
  doctorFee: { type: Number },
  hospitalFee: { type: Number },
  channelingFee: { type: Number },
  noShowRefund: { type: Boolean, default: false },
  noShowFee: { type: Number, default: 0 },
  paymentStatus: { type: String, default: 'Paid' },
  cardHolderName: { type: String },
  cardNumber: { type: String }, // Partial/Masked for records

  // ── Video-call queue fields (dev-dilshari's Doctor Module) ──
  patientId: { type: String, index: true },
  notes: { type: String },
  status: {
    type: String,
    enum: ['pending', 'ongoing', 'completed', 'cancelled'],
    default: 'pending',
    index: true,
  },
  date: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);