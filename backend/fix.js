const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Appointment = require('./models/Appointment');
  
  // Set missing statuses to 'completed'
  const res1 = await Appointment.updateMany(
    { status: { $exists: false } },
    { $set: { status: 'completed' } }
  );
  console.log('Updated undefined statuses to completed:', res1.modifiedCount);
  
  // Also check for null statuses just in case
  const res2 = await Appointment.updateMany(
    { status: null },
    { $set: { status: 'completed' } }
  );
  console.log('Updated null statuses to completed:', res2.modifiedCount);

  process.exit(0);
}).catch(console.error);
