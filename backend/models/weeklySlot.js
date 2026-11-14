const mongoose = require('mongoose');

const WeeklySlotSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    day: { type: String, required: true, enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] },
    time: { type: String, required: true },
    status: { type: String, enum: ['Available', 'Booked'], default: 'Available' },
    hospital: { type: String, required: true },
    location: { type: String, default: 'Colombo 7' },
    totalPatients: { type: Number, default: 0 }
}, { collection: 'weeklyslots' });

module.exports = mongoose.model('WeeklySlot', WeeklySlotSchema);