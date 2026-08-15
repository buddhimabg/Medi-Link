const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  console.log("Looking for dates >=", twelveMonthsAgo);

  const appointments = await Appointment.aggregate([
    {
      $match: {
        appointmentDate: { $gte: twelveMonthsAgo }
      }
    },
    {
      $group: {
        _id: { $month: "$appointmentDate" },
        count: { $sum: 1 }
      }
    }
  ]);
  console.log("Aggregation:", appointments);
  
  const raw = await Appointment.find({}).limit(2);
  if (raw.length > 0) {
    console.log("First raw record appointmentDate:", raw[0].appointmentDate);
    console.log("Is it a Date object?", raw[0].appointmentDate instanceof Date);
    console.log("Type:", typeof raw[0].appointmentDate);
  } else {
    console.log("No appointments found");
  }
  
  process.exit(0);
}
run().catch(console.error);
