const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  console.log("MONGO_URI =", mongoUri); // move here for debug

  if (!mongoUri) {
    throw new Error("MONGO_URI is not defined in the environment.");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(mongoUri);

  console.log("MongoDB Connected");
  return mongoose.connection;
};

module.exports = connectDB;