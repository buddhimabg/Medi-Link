require('dotenv').config();
const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ ERROR: MONGODB_URI not found in .env file');
    process.exit(1);
}

const connectToDatabase = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ MongoDB Atlas Connected Successfully!');
        return true;
    } catch (err) {
        console.error('❌ MongoDB Atlas Connection Error:');
        console.error(err);
        // Return false instead of exiting so the server can start for debugging.
        // The server will log that DB is unavailable; this helps diagnose issues
        // without the process terminating immediately.
        return false;
    }
};

module.exports = { connectToDatabase, mongoose };
