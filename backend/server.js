// server.js
const dns = require('dns');
// ✅ Fix for "querySrv ECONNREFUSED" — force Node to use public DNS
// (your local router DNS can't resolve MongoDB's SRV records)
dns.setServers(['8.8.8.8', '1.1.1.1']);

const http      = require('http');
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const path      = require('path');
const { Server } = require('socket.io');
require('dotenv').config();

const videoRoutes          = require('./src/routes/videoRoutes');
const prescriptionRoutes   = require('./src/routes/prescriptionRoutes');
const appointmentRoutes    = require('./src/routes/appointmentRoutes');
const authRoutes           = require('./src/routes/authRoutes');
const patientHistoryRoutes = require('./src/routes/patientHistoryRoutes');
const chatRoutes           = require('./src/routes/chatRoutes');
const journalRoutes        = require('./src/routes/journalRoutes');

const app    = express();
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:      process.env.CLIENT_URL || 'http://localhost:5175', // Updated for clarity
    credentials: true,
  },
});

// Attach io to app so controllers can emit events
app.set('io', io);

io.on('connection', (socket) => {
  // Doctor joins a session room to listen for patient events
  socket.on('join-session-room', ({ sessionId }) => {
    if (sessionId) {
      socket.join(`session:${sessionId}`);
      console.log(`🔌 Socket joined room: session:${sessionId}`);
    }
  });

  // Patient notifies that they have joined — doctor's WaitingRoom picks this up
  socket.on('patient-joined', ({ sessionId, patientName }) => {
    console.log(`🔔 patient-joined → session:${sessionId}, patient: ${patientName}`);
    io.to(`session:${sessionId}`).emit('patient-joined', { sessionId, patientName });
  });

  // Doctor joins their own personal room once, on app load — so
  // 🚨 escalation-alert events reach them no matter which screen
  // they're on (not just inside the specific chat conversation)
  socket.on('join-doctor-room', ({ doctorId }) => {
    if (doctorId) {
      socket.join(`doctor:${doctorId}`);
      console.log(`🚨 Socket joined doctor room: doctor:${doctorId}`);
    }
  });

  // ── Chat rooms ───────────────────────────────────────────────────────────

  // Doctor or patient joins a conversation room for real-time messages
  socket.on('join-chat-room', ({ conversationId }) => {
    if (conversationId) {
      socket.join(`chat:${conversationId}`);
      console.log(`💬 Socket joined chat room: chat:${conversationId}`);
    }
  });

  socket.on('leave-chat-room', ({ conversationId }) => {
    if (conversationId) {
      socket.leave(`chat:${conversationId}`);
    }
  });

  // Typing indicators
  socket.on('typing', ({ conversationId, role }) => {
    socket.to(`chat:${conversationId}`).emit('typing', { conversationId, role });
  });

  socket.on('stop-typing', ({ conversationId, role }) => {
    socket.to(`chat:${conversationId}`).emit('stop-typing', { conversationId, role });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// ── Middleware ─────────────────────────────────────────────────────────────
// ✅ Updated CORS configuration to allow your specific frontend origin
app.use(cors({
  origin:      ['http://localhost:5174', 'http://localhost:5173'], // common Vite ports
  credentials: true,
}));
app.use(express.json());

// ── Static uploads folder ──────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // ✅ fixed: removed 'src'

// ── Database ───────────────────────────────────────────────────────────────
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is missing in your .env file. Check the variable name/spelling.');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch(err => {
    console.error('❌ MongoDB Error:', err.message);
    process.exit(1); // don't let the server run "successfully" with no DB
  });

// ── Routes ─────────────────────────────────────────────────────────────────

// Auth routes  →  /api/auth/*
app.use('/api/auth', authRoutes);

// Video call routes  →  /api/video/*
app.use('/api/video', videoRoutes);

// Prescription routes  →  /api/prescriptions/*
app.use('/api/prescriptions', prescriptionRoutes);

// Appointment routes  →  /api/appointments/*
app.use('/api/appointments', appointmentRoutes);

// Patient history routes  →  /api/patient-history/*
app.use('/api/patient-history', patientHistoryRoutes);

// Chat + Chatbot routes  →  /api/chat/*
app.use('/api/chat', chatRoutes);

// Journal routes  →  /api/journals/*
app.use('/api/journals', journalRoutes);

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', service: 'MediLink Video API' }));

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── Global error handler ───────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Auth:            http://localhost:${PORT}/api/auth`);
  console.log(`   Video API:       http://localhost:${PORT}/api/video`);
  console.log(`   Prescriptions:   http://localhost:${PORT}/api/prescriptions`);
  console.log(`   Appointments:    http://localhost:${PORT}/api/appointments`);
  console.log(`   Patient History: http://localhost:${PORT}/api/patient-history`);
  console.log(`   Chat / Chatbot:  http://localhost:${PORT}/api/chat`);
  console.log(`   Journals:        http://localhost:${PORT}/api/journals`);
  console.log(`   WebSocket:       ws://localhost:${PORT}`);
});