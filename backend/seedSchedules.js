const mongoose = require('mongoose');
require('dotenv').config();
const Doctor = require('./models/doctor');
const DoctorSchedule = require('./models/doctorSchedule');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB Atlas.");

    // Clear existing schedules
    const deleteResult = await DoctorSchedule.deleteMany({});
    console.log(`Cleared ${deleteResult.deletedCount} existing doctor schedules.`);

    const doctors = await Doctor.find({});
    console.log(`Fetched ${doctors.length} doctors from database.`);

    const dates = [
      "2026-07-18",
      "2026-07-19",
      "2026-07-20",
      "2026-07-21",
      "2026-07-22",
      "2026-07-23"
    ];

    const slotTemplates = [
      "09:00 AM",
      "09:45 AM",
      "10:00 AM",
      "11:00 AM",
      "12:00 PM",
      "02:00 PM",
      "03:30 PM",
      "04:30 PM"
    ];

    const schedulesToInsert = [];

    doctors.forEach(doctor => {
      dates.forEach((date, dateIdx) => {
        // Select a subset of slots for variety (e.g. 4-6 slots per day)
        const dailySlots = [];
        slotTemplates.forEach((time, slotIdx) => {
          // Deterministic slot assignment for variety
          if ((doctor.name.charCodeAt(0) + dateIdx + slotIdx) % 2 === 0) {
            dailySlots.push({
              time: time,
              isBooked: false
            });
          }
        });

        // Ensure every doctor has at least some slots every day
        if (dailySlots.length === 0) {
          dailySlots.push({ time: "10:00 AM", isBooked: false });
          dailySlots.push({ time: "02:00 PM", isBooked: false });
        }

        schedulesToInsert.push({
          doctorId: doctor._id,
          date: date,
          slots: dailySlots
        });
      });
    });

    const insertResult = await DoctorSchedule.insertMany(schedulesToInsert);
    console.log(`Successfully seeded ${insertResult.length} doctor schedule documents!`);

    // Let's also update the Doctors' legacy availableSlots array to sync with these seeded slots!
    // The legacy array contains slot strings in the format "YYYY-MM-DD Time" (e.g., "2026-07-18 09:45 AM")
    for (const doctor of doctors) {
      const docSchedules = insertResult.filter(s => s.doctorId.toString() === doctor._id.toString());
      const allLegacySlots = [];
      docSchedules.forEach(sched => {
        sched.slots.forEach(slot => {
          if (!slot.isBooked) {
            allLegacySlots.push(`${sched.date} ${slot.time}`);
          }
        });
      });
      await Doctor.findByIdAndUpdate(doctor._id, { $set: { availableSlots: allLegacySlots } });
    }
    console.log("Successfully synchronized legacy availableSlots array on Doctor documents.");

    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
