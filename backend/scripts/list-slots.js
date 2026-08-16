const { connectToDatabase } = require('../db');
const WeeklySlot = require('../models/weeklySlot');

(async () => {
  await connectToDatabase();
  const slots = await WeeklySlot.find().sort({ id: 1 }).lean();
  console.log(`Found ${slots.length} slots:`);
  slots.forEach(s => console.log(`id=${s.id} day=${s.day} time=${s.time} hospital=${s.hospital}`));
  process.exit(0);
})();
