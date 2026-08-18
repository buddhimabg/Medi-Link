// One-off data fix: some Doctor.userId values were stored as raw strings
// instead of ObjectId (likely from the self-service doctor-profile-update
// path assigning req.userId, a JWT-decoded string, without explicit cast).
// A string-typed userId never matches Mongoose's auto-cast ObjectId queries
// (e.g. Doctor.findOne({ userId: someId })), which is what caused issued
// prescriptions to show "Unknown Doctor" for affected doctors.
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

(async () => {
  await connectDB();
  const collection = mongoose.connection.db.collection('doctors');
  const docs = await collection.find({ userId: { $exists: true, $ne: null } }).toArray();

  let fixed = 0;
  for (const doc of docs) {
    if (!(doc.userId instanceof mongoose.Types.ObjectId) && mongoose.Types.ObjectId.isValid(doc.userId)) {
      await collection.updateOne(
        { _id: doc._id },
        { $set: { userId: new mongoose.Types.ObjectId(doc.userId) } }
      );
      console.log(`Fixed userId type for doctor "${doc.name}" (${doc._id})`);
      fixed++;
    }
  }

  console.log(`Done. ${fixed} doctor record(s) fixed out of ${docs.length} checked.`);
  process.exit(0);
})();
