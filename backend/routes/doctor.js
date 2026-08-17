const express = require('express');
const router = express.Router();
const Doctor = require('../models/doctor');

// Get doctor profile
router.get('/profile', async (req, res) => {
    try {
        // return first available doctor profile from DB
        const doctor = await Doctor.findOne();
        if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });
        res.json(doctor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update doctor profile
router.put('/profile/:id', async (req, res) => {
    try {
        const doctorId = parseInt(req.params.id);
        const { phone, bio, photo, email, specialty, licenseNumber, yearsOfExperience } = req.body;

        // Basic validation
        if (phone) {
            // strip all non-digit characters
            const digits = String(phone).replace(/\D/g, '');
            // Require exactly 10 digits
            if (!/^\d{10}$/.test(digits)) {
                return res.status(400).json({ errors: { phone: 'Phone number must contain exactly 10 digits' } });
            }
        }
        if (email) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({ errors: { email: 'Invalid email address' } });
            }
        }
        if (specialty) {
            if (typeof specialty !== 'string' || specialty.trim().length < 2) {
                return res.status(400).json({ errors: { specialty: 'Specialty must be at least 2 characters' } });
            }
        }
        if (licenseNumber) {
            if (typeof licenseNumber !== 'string' || licenseNumber.trim().length < 3) {
                return res.status(400).json({ errors: { licenseNumber: 'License number must be at least 3 characters' } });
            }
        }
        if (yearsOfExperience !== undefined) {
            const yrs = Number(yearsOfExperience);
            if (!Number.isInteger(yrs) || yrs < 0 || yrs > 80) {
                return res.status(400).json({ errors: { yearsOfExperience: 'Years of experience must be an integer between 0 and 80' } });
            }
        }

        const update = {};
        if (phone !== undefined) {
            // store normalized digits-only phone
            update.phone = String(phone).replace(/\D/g, '');
        }
        if (bio !== undefined) update.bio = bio;
        if (photo !== undefined) update.photo = photo;
        if (email !== undefined) update.email = email;
        if (specialty !== undefined) update.specialty = specialty;
        if (licenseNumber !== undefined) update.licenseNumber = licenseNumber;
        if (yearsOfExperience !== undefined) update.yearsOfExperience = yearsOfExperience;

        const doctor = await Doctor.findOneAndUpdate(
            { id: doctorId },
            { $set: update },
            { new: true, upsert: true }
        );

        res.json(doctor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
