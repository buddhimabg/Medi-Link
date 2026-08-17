const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    time: { type: String, required: true },
    status: { type: String, enum: ['Available', 'Booked'], default: 'Available' },
    hospital: { type: String, required: true },
    location: { type: String, default: 'Colombo 7' },
    day: { type: String, enum: ['MON','TUE','WED','THU','FRI','SAT','SUN'] },
    date: { type: String },
    week: { type: String, enum: ['last','current','next'], default: 'current' },
    doctorId: { type: Number, default: 1 },
    totalPatients: { type: Number, default: 0 }
});

module.exports = mongoose.model('Session', SessionSchema);