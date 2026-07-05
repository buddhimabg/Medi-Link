const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  doctorId: { type: String, required: true },
  notes: { type: String, default: "" },
  prescription: { type: String, default: "" },
  status: { type: String, default: "ongoing" }, // උදා: ongoing, completed
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', AppointmentSchema);