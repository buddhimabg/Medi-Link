// src/routes/chatRoutes.js
// All chatbot + messaging routes → /api/chat/*
const express = require('express');
const router  = express.Router();

const { protect, requireRole } = require('../middlewares/auth');

const convCtrl = require('../controllers/conversationController');
const botCtrl  = require('../controllers/botController');
const faqCtrl  = require('../controllers/faqController');

// ── Conversation Routes ────────────────────────────────────────────────────

// GET  /api/chat/patients
// System එකේ සියලු registered patients — "New Message" search සඳහා
router.get(
  '/patients',
  protect,
  requireRole('doctor'),
  convCtrl.getAllPatients
);

// GET  /api/chat/patients/:patientId/profile
// Real patient snapshot for the "👤 Profile" chatbot screen
router.get(
  '/patients/:patientId/profile',
  protect,
  requireRole('doctor'),
  convCtrl.getPatientProfile
);

// GET  /api/chat/recent-messages?limit=5
// Dashboard "Recent Patient Messages" card සඳහා
router.get(
  '/recent-messages',
  protect,
  requireRole('doctor'),
  convCtrl.getRecentMessages
);

// GET  /api/chat/conversations
// Doctor ගේ සියලු conversations (unread count + last message)
router.get(
  '/conversations',
  protect,
  requireRole('doctor'),
  convCtrl.getConversations
);

// GET  /api/chat/conversations/with/:patientId
// Get or create a conversation between logged-in doctor + patient
router.get(
  '/conversations/with/:patientId',
  protect,
  requireRole('doctor'),
  convCtrl.getOrCreateConversation
);

// GET  /api/chat/conversations/session/:sessionId
// Get or create the conversation tied to a video call session.
// Open to BOTH doctor and patient — the patient side has no other way
// to discover their doctor's user id, so it looks both up from the
// VideoSession record itself.
router.get(
  '/conversations/session/:sessionId',
  protect,
  convCtrl.getConversationBySession
);

// GET  /api/chat/conversations/:id/messages?page=1&limit=30
// Paginated message history for a conversation
router.get(
  '/conversations/:id/messages',
  protect,
  convCtrl.getMessages
);

// POST /api/chat/conversations/:id/messages
// Send a message (doctor or patient)
router.post(
  '/conversations/:id/messages',
  protect,
  convCtrl.sendMessage
);

// PATCH /api/chat/conversations/:id/read
// Mark all patient messages as read (doctor opens chat)
router.patch(
  '/conversations/:id/read',
  protect,
  requireRole('doctor'),
  convCtrl.markAsRead
);

// ── Bot / AI Routes ────────────────────────────────────────────────────────

// POST /api/chat/ai-reply
// Doctor gets an AI suggestion for the latest patient message (no auto-send)
// Body: { conversationId, patientMessage }
router.post(
  '/ai-reply',
  protect,
  requireRole('doctor'),
  botCtrl.getAISuggestion
);

// GET  /api/chat/bot-settings
// Fetch doctor's bot configuration
router.get(
  '/bot-settings',
  protect,
  requireRole('doctor'),
  botCtrl.getBotSettings
);

// PUT  /api/chat/bot-settings
// Update doctor's bot configuration
// Body: { isActive, autoReplyMode, systemPrompt, model, faqConfidenceThreshold, offHoursStart, offHoursEnd }
router.put(
  '/bot-settings',
  protect,
  requireRole('doctor'),
  botCtrl.updateBotSettings
);

// ── Broadcast Routes ───────────────────────────────────────────────────────

// POST /api/chat/broadcast
// Doctor sends a bulk message to selected patients
// Body: { message, patientIds: [] }
router.post(
  '/broadcast',
  protect,
  requireRole('doctor'),
  botCtrl.sendBroadcast
);

// GET  /api/chat/broadcast
// Doctor's broadcast history
router.get(
  '/broadcast',
  protect,
  requireRole('doctor'),
  botCtrl.getBroadcasts
);

// ── Analytics Route ────────────────────────────────────────────────────────

// GET  /api/chat/analytics
// Dashboard stats — total messages, unread, AI replied, FAQ queries, top FAQs
router.get(
  '/analytics',
  protect,
  requireRole('doctor'),
  botCtrl.getAnalytics
);

// ── FAQ Routes ─────────────────────────────────────────────────────────────

// GET  /api/chat/faqs
// List all FAQs for the logged-in doctor
// Query: ?category=MEDICATION&active=true
router.get(
  '/faqs',
  protect,
  requireRole('doctor'),
  faqCtrl.getFAQs
);

// GET  /api/chat/faqs/:id
// Get a single FAQ
router.get(
  '/faqs/:id',
  protect,
  requireRole('doctor'),
  faqCtrl.getFAQById
);

// POST /api/chat/faqs
// Create a new FAQ
// Body: { question, answer, keywords[], category }
router.post(
  '/faqs',
  protect,
  requireRole('doctor'),
  faqCtrl.createFAQ
);

// PUT  /api/chat/faqs/:id
// Update an existing FAQ
router.put(
  '/faqs/:id',
  protect,
  requireRole('doctor'),
  faqCtrl.updateFAQ
);

// DELETE /api/chat/faqs/:id
// Hard-delete a FAQ
router.delete(
  '/faqs/:id',
  protect,
  requireRole('doctor'),
  faqCtrl.deleteFAQ
);

// PATCH /api/chat/faqs/:id/toggle
// Quick enable/disable toggle
router.patch(
  '/faqs/:id/toggle',
  protect,
  requireRole('doctor'),
  faqCtrl.toggleFAQ
);

module.exports = router;