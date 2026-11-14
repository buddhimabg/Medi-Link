// connect-patients-to-slots.js
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGO_URI;

const patientSchema = new mongoose.Schema({
    id: Number,
    name: String,
    sessionId: Number
});

const Patient = mongoose.model('TreatmentPatientProfile', patientSchema, 'patientslist');

async function connectPatients() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        // Clear existing connections
        const cleared = await Patient.updateMany({}, { $set: { sessionId: null } });
        console.log(`🗑️ Cleared session IDs from ${cleared.modifiedCount} patients\n`);
        
        // Connect patients to slots
        // Slot 1 (Monday 6AM) - Patients 1,2
        await Patient.updateOne({ id: 1 }, { $set: { sessionId: 1 } });
        await Patient.updateOne({ id: 2 }, { $set: { sessionId: 1 } });
        console.log('✅ Slot 1: Patients 1,2 connected');
        
        // Slot 2 (Monday 5PM) - Patients 3,4
        await Patient.updateOne({ id: 3 }, { $set: { sessionId: 2 } });
        await Patient.updateOne({ id: 4 }, { $set: { sessionId: 2 } });
        console.log('✅ Slot 2: Patients 3,4 connected');
        
        // Slot 3 (Monday 8PM) - Patients 5,6
        await Patient.updateOne({ id: 5 }, { $set: { sessionId: 3 } });
        await Patient.updateOne({ id: 6 }, { $set: { sessionId: 3 } });
        console.log('✅ Slot 3: Patients 5,6 connected');
        
        // Slot 4 (Tuesday 6AM) - Patients 7,8
        await Patient.updateOne({ id: 7 }, { $set: { sessionId: 4 } });
        await Patient.updateOne({ id: 8 }, { $set: { sessionId: 4 } });
        console.log('✅ Slot 4: Patients 7,8 connected');
        
        // Slot 5 (Tuesday 5PM) - Patients 9,10
        await Patient.updateOne({ id: 9 }, { $set: { sessionId: 5 } });
        await Patient.updateOne({ id: 10 }, { $set: { sessionId: 5 } });
        console.log('✅ Slot 5: Patients 9,10 connected');
        
        // Slot 6 (Tuesday 8PM) - Patients 11,12
        await Patient.updateOne({ id: 11 }, { $set: { sessionId: 6 } });
        await Patient.updateOne({ id: 12 }, { $set: { sessionId: 6 } });
        console.log('✅ Slot 6: Patients 11,12 connected');
        
        // Slot 7 (Wednesday 6AM) - Patients 13,14 (Lasith Malinga)
        await Patient.updateOne({ id: 13 }, { $set: { sessionId: 7 } });
        await Patient.updateOne({ id: 14 }, { $set: { sessionId: 7 } });
        console.log('✅ Slot 7: Patients 13,14 (Lasith Malinga) connected');
        
        // Slot 8 (Wednesday 5PM) - Patient 15 (Nadeesha Ranasinghe)
        await Patient.updateOne({ id: 15 }, { $set: { sessionId: 8 } });
        console.log('✅ Slot 8: Patient 15 (Nadeesha Ranasinghe) connected');
        
        // Verify connections
        console.log('\n📋 VERIFICATION: Patient-Slot Connections');
        console.log('----------------------------------------');
        
        const results = await Patient.find({}, { id: 1, name: 1, sessionId: 1 }).sort({ id: 1 });
        results.forEach(p => {
            if (p.sessionId) {
                console.log(`   Patient ${p.id}: ${p.name.padEnd(25)} → Slot ${p.sessionId}`);
            } else {
                console.log(`   Patient ${p.id}: ${p.name.padEnd(25)} → Not assigned`);
            }
        });
        
        // Count patients per slot
        console.log('\n📊 PATIENTS PER SLOT:');
        for (let slotId = 1; slotId <= 8; slotId++) {
            const count = await Patient.countDocuments({ sessionId: slotId });
            if (count > 0) {
                console.log(`   Slot ${slotId}: ${count} patient(s)`);
            }
        }
        
        await mongoose.connection.close();
        console.log('\n✨ Connection completed successfully!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

connectPatients();