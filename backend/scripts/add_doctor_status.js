const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://pavindugrx11_db_user:9hg8An6yL295JPLW@ac-pdfzbxj-shard-00-00.rqoahkh.mongodb.net:27017,ac-pdfzbxj-shard-00-01.rqoahkh.mongodb.net:27017,ac-pdfzbxj-shard-00-02.rqoahkh.mongodb.net:27017/medilink_db?ssl=true&replicaSet=atlas-76m1iy-shard-0&authSource=admin&retryWrites=true&w=majority';

async function addStatusField() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  // Add 'status' field set to 'active' for all doctors that don't have it
  const result = await db.collection('doctors').updateMany(
    { status: { $exists: false } },
    { $set: { status: 'active' } }
  );

  console.log(`Updated ${result.modifiedCount} doctors with status field`);

  // Verify
  const docs = await db.collection('doctors').find({}, { projection: { name: 1, status: 1 } }).toArray();
  docs.forEach(doc => {
    console.log(`  ${doc.name}: ${doc.status}`);
  });

  await mongoose.disconnect();
  process.exit(0);
}

addStatusField().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
