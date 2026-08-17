require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const collection = db.collection('patients');
  const status = await collection.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray();
  const createdAtResult = await collection.aggregate([{ $group: { _id: { $type: '$createdAt' }, count: { $sum: 1 } } }]).toArray();
  const sample = await collection.findOne({});
  console.log('Statuses:', status);
  console.log('CreatedAt types:', createdAtResult);
  console.log('Sample:', sample);
  mongoose.connection.close();
}).catch(console.error);
