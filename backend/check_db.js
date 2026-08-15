require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const collection = db.collection('appointments');
  const result = await collection.aggregate([{
    $group: { _id: '$type', count: { $sum: 1 } }
  }]).toArray();
  const typeResult = await collection.aggregate([{
    $group: { _id: '$consultationType', count: { $sum: 1 } }
  }]).toArray();
  const statusResult = await collection.aggregate([{
    $group: { _id: '$status', count: { $sum: 1 } }
  }]).toArray();
  console.log("Types:", result);
  console.log("Consultation Types:", typeResult);
  console.log("Status:", statusResult);
  mongoose.connection.close();
}).catch(console.error);
