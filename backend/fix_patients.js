require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const collection = db.collection('patients');
  
  // Update missing status to 'active'
  await collection.updateMany(
    { status: { $exists: false } },
    { $set: { status: 'active' } }
  );

  // Update missing createdAt to a recent date (e.g., today)
  await collection.updateMany(
    { createdAt: { $exists: false } },
    { $set: { createdAt: new Date() } }
  );

  const status = await collection.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray();
  console.log('Updated Statuses:', status);
  mongoose.connection.close();
}).catch(console.error);
