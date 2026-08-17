const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://pavindugrx11_db_user:9hg8An6yL295JPLW@ac-pdfzbxj-shard-00-00.rqoahkh.mongodb.net:27017,ac-pdfzbxj-shard-00-01.rqoahkh.mongodb.net:27017,ac-pdfzbxj-shard-00-02.rqoahkh.mongodb.net:27017/medilink_db?ssl=true&replicaSet=atlas-76m1iy-shard-0&authSource=admin&retryWrites=true&w=majority';

async function testStatusUpdate() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  // Test updating status to on-leave
  const result = await db.collection('doctors').updateOne(
    { _id: new mongoose.Types.ObjectId('69f8d1bbb2d06c81a95d42c1') },
    { $set: { status: 'on-leave' } }
  );
  console.log('Update result:', result.modifiedCount);

  // Verify
  const doc = await db.collection('doctors').findOne(
    { _id: new mongoose.Types.ObjectId('69f8d1bbb2d06c81a95d42c1') },
    { projection: { name: 1, status: 1 } }
  );
  console.log('After update:', doc.name, '->', doc.status);

  // Revert back to active
  await db.collection('doctors').updateOne(
    { _id: new mongoose.Types.ObjectId('69f8d1bbb2d06c81a95d42c1') },
    { $set: { status: 'active' } }
  );
  console.log('Reverted back to active');

  await mongoose.disconnect();
  process.exit(0);
}

testStatusUpdate().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
