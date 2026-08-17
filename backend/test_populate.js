const mongoose = require('mongoose');
const Patient = require('./models/Patient');
const Doctor = require('./models/Doctor');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const patients = await Patient.find({})
      .populate('userId', 'name email phone profileImage address')
      .populate({
        path: 'assignedDoctor',
        select: 'name userId',
        populate: {
          path: 'userId',
          select: 'name'
        }
      })
      .limit(2);
      
  console.log(JSON.stringify(patients, null, 2));
  mongoose.disconnect();
}).catch(console.error);
