// Creates (or resets the password of) the default admin account used to log
// into the admin dashboard (ManageDoctors, DoctorApprovals, ManagePatients,
// Reports, Settings). Run: node scripts/seedAdmin.js
require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/user");

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@test.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "abcd1234";

const seedAdmin = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await connectDB();

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    let admin = await User.findOne({ email: ADMIN_EMAIL });
    if (admin) {
      admin.password = hashedPassword;
      admin.role = "admin";
      await admin.save();
      console.log(`Updated existing admin account: ${ADMIN_EMAIL}`);
    } else {
      admin = await User.create({
        name: "Admin",
        email: ADMIN_EMAIL,
        password: hashedPassword,
        mobile: "0000000000",
        gender: "Not Specified",
        city: "Not Specified",
        dob: new Date("2000-01-01"),
        role: "admin",
      });
      console.log(`Created new admin account: ${ADMIN_EMAIL}`);
    }

    console.log(`Login with email "${ADMIN_EMAIL}" and password "${ADMIN_PASSWORD}".`);
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed admin account:", error.message || error);
    process.exit(1);
  }
};

seedAdmin();
