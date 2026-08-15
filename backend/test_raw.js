const mongoose = require('mongoose');
const Patient = require('./models/Patient');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const patients = await Patient.find({}).select('assignedDoctor name email');
  console.log(JSON.stringify(patients.map(p => p.assignedDoctor), null, 2));
  mongoose.disconnect();
});
