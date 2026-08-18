// Removes stale (past) DoctorSchedule entries and creates fresh sessions for
// every doctor covering the next 7 days, so the booking flow always has
// bookable slots. Run: node scripts/refreshDoctorSchedules.js
require("dotenv").config();
const connectDB = require("../config/db");
const Doctor = require("../models/doctor");
const DoctorSchedule = require("../models/doctorSchedule");

const DAYS_AHEAD = 7;
const DAILY_SLOTS = ["09:00 AM", "10:00 AM", "12:00 PM", "03:30 PM"];

const toDateStr = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const refresh = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await connectDB();

    const today = new Date();
    const todayStr = toDateStr(today);

    const staleResult = await DoctorSchedule.deleteMany({ date: { $lt: todayStr } });
    console.log(`Removed ${staleResult.deletedCount} stale schedule day(s) before ${todayStr}.`);

    const nextDates = [];
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      nextDates.push(toDateStr(d));
    }

    const doctors = await Doctor.find({}, "_id name");
    console.log(`Creating sessions for ${doctors.length} doctor(s) across ${DAYS_AHEAD} day(s): ${nextDates.join(", ")}`);

    let created = 0;
    for (const doctor of doctors) {
      for (const dateStr of nextDates) {
        const existing = await DoctorSchedule.findOne({ doctorId: doctor._id, date: dateStr });
        if (existing) continue;

        await DoctorSchedule.create({
          doctorId: doctor._id,
          date: dateStr,
          slots: DAILY_SLOTS.map((time) => ({ time, isBooked: false })),
        });
        created++;
      }
    }

    console.log(`Created ${created} new schedule day(s).`);
    console.log("Refresh complete.");
  } catch (err) {
    console.error("Refresh failed:", err);
  } finally {
    process.exit(0);
  }
};

refresh();
