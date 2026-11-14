// Backfills virtualPrice/physicalPrice (required by the booking flow) on
// doctor records that predate those fields or were created via the admin
// approval workflow (which never set them). Also fills in name/specialty
// for any doctor missing them, using their linked User account.
// Run: node scripts/backfillDoctorPricing.js
require("dotenv").config();
const connectDB = require("../config/db");
const Doctor = require("../models/doctor");
const User = require("../models/user");

const DEFAULT_VIRTUAL_PRICE = 2500;
const DEFAULT_PHYSICAL_PRICE = 3500;

const backfill = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await connectDB();

    const doctors = await Doctor.find({
      $or: [
        { virtualPrice: { $exists: false } },
        { virtualPrice: null },
        { physicalPrice: { $exists: false } },
        { physicalPrice: null },
        { name: { $exists: false } },
        { name: null },
        { specialty: { $exists: false } },
        { specialty: null },
      ],
    });

    console.log(`Found ${doctors.length} doctor record(s) needing backfill.`);

    for (const doc of doctors) {
      const updates = {};

      if (!doc.virtualPrice) updates.virtualPrice = DEFAULT_VIRTUAL_PRICE;
      if (!doc.physicalPrice) updates.physicalPrice = DEFAULT_PHYSICAL_PRICE;

      if (!doc.name || !doc.specialty) {
        let linkedUser = null;
        if (doc.userId) {
          linkedUser = await User.findById(doc.userId);
        }
        if (!doc.name) updates.name = linkedUser?.name || "Unnamed Doctor";
        if (!doc.specialty) updates.specialty = doc.specialization || "General";
      }

      await Doctor.updateOne({ _id: doc._id }, { $set: updates });
      console.log(`Updated ${doc._id}:`, updates);
    }

    console.log("Backfill complete.");
  } catch (err) {
    console.error("Backfill failed:", err);
  } finally {
    process.exit(0);
  }
};

backfill();
