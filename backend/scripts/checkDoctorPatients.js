// scripts/checkDoctorPatients.js
// One-off diagnostic — run from the backend folder:
//   node scripts/checkDoctorPatients.js
//
// Dumps, straight from the DB (no app logic involved), everything
// related to matching a doctor's login account to their booked
// patients. Uses the same .env / MONGO_URI the main server uses.

require('dotenv').config();
const mongoose = require('mongoose');

const Doctor = require('../models/doctor');
const User = require('../models/user');
const Appointment = require('../models/appointment');
const Conversation = require('../models/Conversation');

// Change this if you want to check a different doctor
const DOCTOR_EMAIL = 'dilshari@medilink.lk';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB.\n');

  console.log('========== 1. User accounts (role: doctor) matching this email ==========');
  const doctorUsers = await User.find(
    { role: 'doctor', email: { $regex: `^${DOCTOR_EMAIL}$`, $options: 'i' } },
    'name email'
  ).lean();
  console.log(doctorUsers);

  console.log('\n========== 2. Doctor directory records matching this email ==========');
  const doctorDirEntries = await Doctor.find(
    { email: { $regex: `^${DOCTOR_EMAIL}$`, $options: 'i' } },
    'name email userId specialty'
  ).lean();
  console.log(doctorDirEntries.map(d => ({
    _id: d._id.toString(),
    name: d.name,
    email: d.email,
    userId: d.userId ? d.userId.toString() : null,
    specialty: d.specialty,
  })));

  const directoryIds = doctorDirEntries.map(d => d._id.toString());

  console.log('\n========== 3. ALL appointments pointing at any of those Doctor directory IDs ==========');
  const appts = await Appointment.find(
    { doctorId: { $in: directoryIds } },
    'userId doctorId doctorName paymentStatus slot'
  ).lean();
  console.log(appts.map(a => ({
    _id: a._id.toString(),
    userId: a.userId,
    doctorId: a.doctorId.toString(),
    doctorName: a.doctorName,
    paymentStatus: a.paymentStatus,
    slot: a.slot,
  })));

  console.log('\n========== 4. Existing Conversation records for this doctor\'s User._id(s) ==========');
  for (const u of doctorUsers) {
    const convs = await Conversation.find({ doctorId: u._id.toString() }).lean();
    console.log(`User._id ${u._id} (${u.email}):`, convs.map(c => ({
      _id: c._id.toString(), patientId: c.patientId, lastMessage: c.lastMessage,
    })));
  }

  console.log('\n========== 5. Sanity check — ALL Doctor directory records with "dilshari" in the name (case-insensitive), regardless of email ==========');
  const byName = await Doctor.find(
    { name: { $regex: 'dilshari', $options: 'i' } },
    'name email userId'
  ).lean();
  console.log(byName.map(d => ({
    _id: d._id.toString(), name: d.name, email: d.email,
    userId: d.userId ? d.userId.toString() : null,
  })));

  console.log('\n========== 6. ALL appointments in the system (most recent 30) — doctorId/doctorName/userId/paymentStatus ==========');
  const allAppts = await Appointment.find({}, 'userId doctorId doctorName paymentStatus slot createdAt')
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
  console.log(allAppts.map(a => ({
    _id: a._id.toString(),
    userId: a.userId,
    doctorId: a.doctorId.toString(),
    doctorName: a.doctorName,
    paymentStatus: a.paymentStatus,
    slot: a.slot,
  })));

  console.log('\n========== 7. Field TYPE check for doctorId — is it really an ObjectId? ==========');
  const rawAppts = await Appointment.find(
    { doctorId: { $in: [directoryIds[0], directoryIds[1]].filter(Boolean) } },
    'userId doctorId paymentStatus'
  ); // NOTE: no .lean() here, so we get real Mongoose docs
  console.log('Matched with plain $in (Mongoose casts strings -> ObjectId automatically):', rawAppts.length);

  // Cross-check by reading with the native driver (bypasses Mongoose
  // schema casting entirely) so we see the RAW BSON type as stored.
  const nativeColl = mongoose.connection.db.collection('appointments');
  const nativeSample = await nativeColl.find(
    { doctorName: { $regex: 'dilshari', $options: 'i' } }
  ).limit(5).toArray();
  console.log('Raw documents (native driver, no Mongoose casting) — doctorId field type per doc:');
  console.log(nativeSample.map(d => ({
    _id: d._id.toString(),
    doctorId: d.doctorId,
    doctorId_bsonType: d.doctorId?._bsontype || typeof d.doctorId,
    doctorId_isObjectIdInstance: d.doctorId instanceof mongoose.Types.ObjectId,
  })));

  await mongoose.disconnect();
  console.log('\nDone.');
};

run().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});