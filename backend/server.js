// mood-backend/server.js

const http = require("http");
const express = require("express");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");
require("dotenv").config();

const connectDB = require("./config/db");

const moodRoutes = require("./routes/moodRoutes");
const authRoutes = require("./routes/authRoutes");
const moodFixRoutes = require("./routes/moodFixRoutes");
const labReportRoutes = require("./routes/labReportRoutes");
const biomarkerRoutes = require("./routes/biomarkerRoutes");
const reminderRoutes = require("./routes/reminderRoutes");
const aiRoutes = require("./routes/aiRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const { errorHandler } = require("./middlewares/errorMiddleware");
const MoodFixActivity = require("./models/moodFixActivity");

const videoRoutes = require("./routes/videoRoutes");
const prescriptionRoutes = require("./routes/prescriptionRoutes");
const patientHistoryRoutes = require("./routes/patientHistoryRoutes");
const chatRoutes = require("./routes/chatRoutes");
const journalRoutes = require("./routes/journalRoutes");

const dashboardRoutes = require("./routes/dashboardRoutes");
const adminDoctorRoutes = require("./routes/adminDoctorRoutes");
const patientRoutes = require("./routes/patientRoutes");
const reportRoutes = require("./routes/reportRoutes");
const systemRoutes = require("./routes/systemRoutes");
const adminNotificationRoutes = require("./routes/adminNotificationRoutes");
const adminPaymentRoutes = require("./routes/adminPaymentRoutes");
const adminSessionRoutes = require("./routes/adminSessionRoutes");

const app = express();
const server = http.createServer(app);

/* ==================
   SOCKET.IO (video calls, live chat)
================== */
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

// Attach io to app so controllers can emit events
app.set("io", io);

io.on("connection", (socket) => {
  // Doctor joins a session room to listen for patient events
  socket.on("join-session-room", ({ sessionId }) => {
    if (sessionId) {
      socket.join(`session:${sessionId}`);
      console.log(`🔌 Socket joined room: session:${sessionId}`);
    }
  });

  // Patient notifies that they have joined — doctor's WaitingRoom picks this up
  socket.on("patient-joined", ({ sessionId, patientName }) => {
    console.log(`🔔 patient-joined → session:${sessionId}, patient: ${patientName}`);
    io.to(`session:${sessionId}`).emit("patient-joined", { sessionId, patientName });
  });

  // Either side (doctor or patient) reports their own mic/cam on/off state
  // so the other side's Participants panel can show it accurately.
  socket.on("media-state", ({ sessionId, role, micOn, camOn }) => {
    if (!sessionId) return;
    socket.to(`session:${sessionId}`).emit("media-state", { role, micOn, camOn });
  });

  // Doctor starting/stopping local recording — broadcast as a live banner
  // event, not a chat message, so it doesn't pollute the conversation log.
  socket.on("recording-status", ({ sessionId, recording }) => {
    if (!sessionId) return;
    socket.to(`session:${sessionId}`).emit("recording-status", { recording });
  });

  // Doctor joins their own personal room once, on app load — so
  // escalation-alert events reach them no matter which screen they're on.
  socket.on("join-doctor-room", ({ doctorId }) => {
    if (doctorId) {
      socket.join(`doctor:${doctorId}`);
      console.log(`🚨 Socket joined doctor room: doctor:${doctorId}`);
    }
  });

  // Doctor or patient joins a conversation room for real-time messages
  socket.on("join-chat-room", ({ conversationId }) => {
    if (conversationId) {
      socket.join(`chat:${conversationId}`);
      console.log(`💬 Socket joined chat room: chat:${conversationId}`);
    }
  });

  socket.on("leave-chat-room", ({ conversationId }) => {
    if (conversationId) {
      socket.leave(`chat:${conversationId}`);
    }
  });

  socket.on("typing", ({ conversationId, role }) => {
    socket.to(`chat:${conversationId}`).emit("typing", { conversationId, role });
  });

  socket.on("stop-typing", ({ conversationId, role }) => {
    socket.to(`chat:${conversationId}`).emit("stop-typing", { conversationId, role });
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

/* ==================
   MIDDLEWARE
================== */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.resolve("uploads")));

/* ==================
   ROUTES
================== */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "MediLink backend is running.",
    docs:
      "Use /api/moods, /api/mood-fix, /api/lab-reports, /api/biomarkers, /api/video, /api/chat, and /api/journals endpoints for data.",
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
app.use("/api/ai", aiRoutes);
app.use("/api/doctors", doctorRoutes);

app.use("/api/wellness", require("./routes/WellnessRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/appointments", require("./routes/appointmentRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/assessments", require("./routes/assessmentRoutes"));

// Video call, chatbot, journals, patient history — dev-dilshari's features
app.use("/api/video", videoRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/patient-history", patientHistoryRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/journals", journalRoutes);

// Admin dashboard — dev-pavindu's feature. Mounted under /api/admin/* (not
// /api/doctors etc.) because /api/doctors is already the patient-facing
// booking directory; the admin doctor-management endpoints are a different
// contract (pagination, verification workflow) living in adminDoctorRoutes.
app.use("/api/admin/dashboard", dashboardRoutes);
app.use("/api/admin/doctors", adminDoctorRoutes);
app.use("/api/admin/patients", patientRoutes);
app.use("/api/admin/reports", reportRoutes);
app.use("/api/admin/system", systemRoutes);
app.use("/api/admin/notifications", adminNotificationRoutes);
app.use("/api/admin/payments", adminPaymentRoutes);
app.use("/api/admin/sessions", adminSessionRoutes);

// 404 for anything unmatched under /api
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

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

const seedBiomarkers = async () => {
  try {
    const Biomarker = require("./models/biomarker");
    const defaultBiomarkers = require("./utils/defaultBiomarkers");
    console.log("Checking and seeding medical biomarkers...");
    for (const bm of defaultBiomarkers) {
      await Biomarker.findOneAndUpdate(
        { name: bm.name },
        { $set: bm },
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Medical biomarkers seeded successfully (${defaultBiomarkers.length} documents).`);
  } catch (err) {
    console.error("Failed to seed biomarkers:", err.message || err);
  }
};

const startServer = async () => {
  try {
    // Connect to DB first so we can seed data if necessary
    await connectDB();
    await seedMoodFixActivities();
    await seedBiomarkers();

    server.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`   WebSocket:       ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server failed to start:", error);
    process.exit(1);
  }
};

startServer();
