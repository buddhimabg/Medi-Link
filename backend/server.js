require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.set('strictQuery', false);

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ ERROR: MONGODB_URI not found in .env file');
    process.exit(1);
}

const { connectToDatabase } = require('./db');

// Models
const Patient = require('./models/patient');
const ChronicDisease = require('./models/chronicDisease');
const Medication = require('./models/medication');
const Visit = require('./models/visit');
const Report = require('./models/report');
const Script = require('./models/script');
const Doctor = require('./models/doctor');
const WeeklySlot = require('./models/weeklySlot');
const TreatmentPlan = require('./models/treatmentPlan');

// Routes
app.use('/api/slots', require('./routes/slots'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/doctor', require('./routes/doctor'));
app.use('/api/health', require('./routes/health'));
app.use('/api/treatment-plans', require('./routes/treatmentPlan'));
// Sessions (appointments)
app.use('/api/sessions', require('./routes/session'));
// Debug endpoints (do not expose in production)
app.use('/api/debug', require('./routes/debug'));

const PORT = process.env.PORT || 5000;

connectToDatabase().then((connected) => {
    if (!connected) {
        console.error('⚠️  Warning: Failed to connect to MongoDB. Starting server for debugging only.');
        console.error(' - Check /api/debug/db for mongoose readyState.');
        console.error(' - The sessions/slots routes will attempt DB operations and may return 500 errors.');
    } else {
        console.log('📡 Connected to MongoDB Atlas Cloud');
    }

    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}).catch((err) => {
    console.error('Unexpected error during DB connection:', err);
    // Start server anyway to allow debugging endpoints to function
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT} (DB connection error)`);
    });
});