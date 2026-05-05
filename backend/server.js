// mood-backend/server.js

const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/db");

const moodRoutes = require("./routes/moodRoutes");
const moodFixRoutes = require("./routes/moodFixRoutes");
const labReportRoutes = require("./routes/labReportRoutes");
const biomarkerRoutes = require("./routes/biomarkerRoutes");
const { errorHandler } = require("./middlewares/errorMiddleware");
const authRoutes = require("./routes/authRoutes");
const doctorRoutes = require("./routes/doctorRoutes");




const app = express();

/* ==================
   MIDDLEWARE
================== */
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve("uploads")));

/* ==================
   ROUTES
================== */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Mood backend is running.",
    docs:
      "Use /api/moods, /api/mood-fix, /api/lab-reports, and /api/biomarkers endpoints for data.",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
  });
});

app.use("/api/moods", moodRoutes);
app.use("/api/mood-fix", moodFixRoutes);
app.use("/api/lab-reports", labReportRoutes);
app.use("/api/biomarkers", biomarkerRoutes);
app.use("/api/auth", authRoutes);
app.use('/api/doctors', require('./routes/doctorRoutes'));


/* ==================
   ERROR HANDLER
================== */
app.use(errorHandler);

/* ==================
   SERVER START
================== */
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });

    connectDB().catch((error) => {
      console.error("⚠️ MongoDB connection failed:", error.message);
      console.error("   The API is still running, but database-backed routes will fail until the connection is fixed.");
    });
  } catch (error) {
    console.error("❌ Server failed to start:", error);
    process.exit(1);
  }
};

startServer();