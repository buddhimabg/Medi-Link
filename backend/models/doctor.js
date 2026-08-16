const mongoose = require('mongoose');

const DoctorSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    specialty: { type: String, default: 'Psychiatrist' },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    hospital: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    yearsOfExperience: { type: Number, required: true },
    qualifications: { type: [String], default: [] },
    languages: { type: [String], default: [] },
    bio: { type: String, default: '' },
    photo: { type: String, default: '' },
    totalPatients: { type: Number, default: 0 },
    sessionsThisMonth: { type: Number, default: 0 },
    rating: { type: Number, default: 4.8 },
    availableDays: { type: [String], default: [] }
});

module.exports = mongoose.model('Doctor', DoctorSchema);
