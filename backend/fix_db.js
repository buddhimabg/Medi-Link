require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const collection = db.collection('appointments');
  
  // Update 'Virtual' types to 'video' consultationType
  await collection.updateMany(
    { type: 'Virtual' },
    { $set: { consultationType: 'video' } }
  );

  // Update null or missing types to 'in-person' consultationType
  await collection.updateMany(
    { type: null },
    { $set: { consultationType: 'in-person' } }
  );

  // Double check
  const typeResult = await collection.aggregate([{
    $group: { _id: '$consultationType', count: { $sum: 1 } }
  }]).toArray();
  
  console.log("Updated Consultation Types:", typeResult);
  mongoose.connection.close();
}).catch(console.error);
