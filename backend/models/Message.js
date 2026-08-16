// src/models/Message.js
// Conversation ඇතුළේ individual message
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Conversation',
      required: true,
      index:    true,
    },
    senderId: {
      type:     String,
      required: true,
    },
    // doctor / patient / bot
    senderRole: {
      type:     String,
      enum:     ['doctor', 'patient', 'bot'],
      required: true,
    },
    text: {
      type:     String,
      required: true,
    },
    // normal = doctor typed manually
    // ai-auto = Claude API replied automatically
    // faq     = FAQ library keyword match replied
    type: {
      type:    String,
      enum:    ['normal', 'ai-auto', 'faq', 'escalation'],
      default: 'normal',
    },
    // Bot reply ලේ AI confidence percentage (0-100)
    aiConfidence: {
      type:    Number,
      default: null,
    },
    // FAQ reply ලේ source FAQ id
    faqId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'FAQ',
      default: null,
    },
    // Related FAQ articles (frontend card ලේ show කරන්න)
    relatedFAQs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:  'FAQ',
      },
    ],
    isRead: {
      type:    Boolean,
      default: false,
    },
    // Patient message eke escalation keyword ekක් match unoth true
    isEscalated: {
      type:    Boolean,
      default: false,
    },
    // Broadcast eken create unu message ekක් nam, e Broadcast eke id eka —
    // patient eka reply karoth Broadcast.readCount eka increment karanna
    broadcastId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Broadcast',
      default: null,
    },
  },
  { timestamps: true }
);

// ── Indexes for fast queries ──────────────────────────────────────────────
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, isRead: 1, senderRole: 1 });

module.exports = mongoose.model('Message', messageSchema);