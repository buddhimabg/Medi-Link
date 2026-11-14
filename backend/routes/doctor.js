const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Doctor = require('../models/treatmentDoctor');

// Get doctor profile by user_id
router.get('/profile/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;

        // Validate that user_id is provided
        if (!user_id) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // `id` is a small sequential display number unrelated to the logged-in
        // account — the actual link to the account is `userId`. Cast to
        // ObjectId explicitly since this model is `strict: false` and won't
        // auto-cast the query filter.
        const doctor = await Doctor.findOne({ userId: new mongoose.Types.ObjectId(user_id) });

        if (!doctor) {
            return res.status(404).json({ error: 'Doctor profile not found' });
        }

        res.json(doctor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update doctor profile
router.put('/profile/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const { phone, bio, email, specialty, licenseNumber, yearsOfExperience } = req.body;

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
        if (email !== undefined) update.email = email;
        if (specialty !== undefined) update.specialty = specialty;
        if (licenseNumber !== undefined) update.licenseNumber = licenseNumber;
        if (yearsOfExperience !== undefined) update.yearsOfExperience = yearsOfExperience;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const doctor = await Doctor.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(user_id) },
            { $set: update },
            { returnDocument: 'after'}
        );

        res.json(doctor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
