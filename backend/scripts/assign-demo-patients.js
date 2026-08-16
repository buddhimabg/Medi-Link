/*
Assign up to 10 existing patients (who have profile-like fields)
randomly to available weekly slots. Updates `sessionId` on patients
and increments `totalPatients` on the slot.

Run: node scripts/assign-demo-patients.js
Make sure .env has MONGODB_URI and the backend dependencies are installed.
*/

const { connectToDatabase } = require('../db');
const Patient = require('../models/patient');
const WeeklySlot = require('../models/weeklySlot');

const pickRandom = arr => arr[Math.floor(Math.random() * arr.length)];

(async function seed() {
  await connectToDatabase();

  try {
    // Prefer patients who appear to have profile data
    const profileQuery = {
      $or: [
        { diagnosis: { $exists: true, $ne: '' } },
        { notes: { $exists: true, $ne: '' } },
        { symptoms: { $exists: true, $ne: [] } },
        { phone: { $exists: true, $ne: '' } },
        { email: { $exists: true, $ne: '' } }
      ]
    };

    let patients = await Patient.find(profileQuery).sort({ id: 1 }).limit(10).lean();

    // Fallback to any patients if not enough with profiles
    if (!patients || patients.length < 10) {
      const need = 10 - (patients ? patients.length : 0);
      const others = await Patient.find({}).sort({ id: 1 }).limit(need).lean();
      patients = (patients || []).concat(others).slice(0, 10);
    }

    if (!patients || patients.length === 0) {
      console.log('No patients found in the collection. Aborting.');
      process.exit(0);
    }

    const slots = await WeeklySlot.find().sort({ id: 1 }).lean();
    if (!slots || slots.length === 0) {
      console.log('No weekly slots found. Aborting.');
      process.exit(0);
    }

    const results = [];

    for (const p of patients) {
      const slot = pickRandom(slots);
      const slotId = slot.id;

      // update patient sessionId
      const updatedPatient = await Patient.findOneAndUpdate(
        { id: p.id },
        { $set: { sessionId: slotId } },
        { new: true }
      );

      // increment slot counter and mark booked
      await WeeklySlot.findOneAndUpdate(
        { id: slotId },
        { $inc: { totalPatients: 1 }, $set: { status: 'Booked' } },
        { new: true }
      );

      results.push({ patientId: p.id, patientName: p.name, slotId });
    }

    console.log(`Assigned ${results.length} patients to slots:`);
    console.table(results);
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
})();
