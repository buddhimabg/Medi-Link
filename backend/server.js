// mood-backend/server.js

const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/db");

const moodRoutes = require("./routes/moodRoutes");
const authRoutes = require("./routes/authRoutes");
const moodFixRoutes = require("./routes/moodFixRoutes");
const labReportRoutes = require("./routes/labReportRoutes");
const biomarkerRoutes = require("./routes/biomarkerRoutes");
const reminderRoutes = require("./routes/reminderRoutes");
const { errorHandler } = require("./middlewares/errorMiddleware");
const MoodFixActivity = require("./models/moodFixActivity");




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
app.use("/api/reminders", reminderRoutes);
app.use("/api/auth", authRoutes);


/* ==================
   ERROR HANDLER
================== */
app.use(errorHandler);

/* ==================
   SERVER START
================== */
const PORT = process.env.PORT || 5000;

const seedMoodFixActivities = async () => {
  try {
    const count = await MoodFixActivity.estimatedDocumentCount();
    if (count === 0) {
      console.log("Seeding default mood-fix activities...");
      const defaults = [
        {
          activityId: "breathing_1",
          title: "Simple Breathing",
          duration: "2 minutes",
          difficulty: "easy",
          focusTag: "breathing",
          benefit: "Calm your nervous system",
          description: "Follow a 4-4 breathing pattern to relax.",
          moods: ["terrible", "sad", "okay", "good", "great"],
          steps: [
            "Find a comfortable seat",
            "Inhale for 4 seconds",
            "Hold for 4 seconds",
            "Exhale for 4 seconds",
            "Repeat for two minutes"
          ],
        },
        {
          activityId: "walk_1",
          title: "Short Walk",
          duration: "10 minutes",
          difficulty: "easy",
          focusTag: "movement",
          benefit: "Increase circulation and shift perspective",
          description: "Take a short mindful walk outdoors or inside.",
          moods: ["sad", "okay", "good"],
          steps: [
            "Put on comfortable shoes",
            "Walk at a relaxed pace",
            "Notice your surroundings",
            "Breathe deeply and return"
          ],
        },
        {
          activityId: "gratitude_1",
          title: "Gratitude Pause",
          duration: "3 minutes",
          difficulty: "easy",
          focusTag: "reflection",
          benefit: "Shift attention to positive aspects",
          description: "List three small things you're grateful for.",
          moods: ["terrible", "sad", "okay"],
          steps: ["Find a quiet moment", "List three things", "Reflect briefly on each"],
        }
      ];

      await MoodFixActivity.insertMany(defaults, { ordered: false });
      console.log("Default mood-fix activities seeded.");
    } else {
      console.log(`Mood-fix activities already present (${count} documents).`);
    }
  } catch (err) {
    console.error("Failed to seed mood-fix activities:", err.message || err);
  }
};

const startServer = async () => {
  try {
    // Connect to DB first so we can seed data if necessary
    await connectDB();
    await seedMoodFixActivities();

    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server failed to start:", error);
    process.exit(1);
  }
};

startServer();