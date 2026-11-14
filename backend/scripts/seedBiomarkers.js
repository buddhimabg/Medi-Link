require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Biomarker = require("../models/biomarker");
const defaultBiomarkers = require("../utils/defaultBiomarkers");

const seedBiomarkers = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await connectDB();

    console.log(`Seeding ${defaultBiomarkers.length} medical biomarkers into database...`);

    let inserted = 0;
    let updated = 0;

    for (const bm of defaultBiomarkers) {
      const existing = await Biomarker.findOne({ name: bm.name });
      if (existing) {
        await Biomarker.findOneAndUpdate({ name: bm.name }, { $set: bm }, { new: true });
        updated++;
      } else {
        await Biomarker.create(bm);
        inserted++;
      }
    }

    console.log(`✅ Biomarkers seed complete! Inserted: ${inserted}, Updated: ${updated}, Total: ${defaultBiomarkers.length}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding biomarkers:", error);
    process.exit(1);
  }
};

seedBiomarkers();
