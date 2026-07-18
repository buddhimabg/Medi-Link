const mongoose = require('mongoose');

const doctorScheduleSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  slots: [
    {
      time: { type: String, required: true }, // e.g. "09:45 AM"
      isBooked: { type: Boolean, default: false }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('DoctorSchedule', doctorScheduleSchema);
