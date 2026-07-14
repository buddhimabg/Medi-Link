// src/models/Conversation.js
// Doctor-patient chat thread එකක් represent කරනවා
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    doctorId: {
      type:     String,
      required: true,
      index:    true,
    },
    patientId: {
      type:     String,
      required: true,
      index:    true,
    },
    // Dashboard list view සඳහා
    lastMessage: {
      type:    String,
      default: '',
    },
    lastMessageAt: {
      type:    Date,
      default: Date.now,
    },
    lastSenderRole: {
      type:    String,
      enum:    ['doctor', 'patient', 'bot'],
      default: 'patient',
    },
    // Unread count (doctor side — patient messages doctor hasn't read)
    unreadCount: {
      type:    Number,
      default: 0,
    },
    isArchived: {
      type:    Boolean,
      default: false,
    },
    // Patient eken escalation keyword ekක් trigger unoth true —
    // doctor ට chat list eke 🚨 red flag ekක් pennanna
    needsEscalation: {
      type:    Boolean,
      default: false,
    },
    lastEscalationAt: {
      type:    Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Doctor + Patient per pair — unique conversation
conversationSchema.index({ doctorId: 1, patientId: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);