// src/models/BotSettings.js
// Per-doctor AI bot configuration
const mongoose = require('mongoose');

const botSettingsSchema = new mongoose.Schema(
  {
    // Per-doctor — unique
    doctorId: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
    // always     = every patient message ට reply කරනවා
    // off_hours  = doctor offline hours ලේ විතරක්
    // never      = bot off
    autoReplyMode: {
      type:    String,
      enum:    ['always', 'off_hours', 'never'],
      default: 'always',
    },
    // Doctor ලිවිය හැකි custom AI personality prompt
    systemPrompt: {
      type:    String,
      default: `You are a helpful medical assistant for a doctor's clinic. 
Reply to patient queries in a warm, professional manner.
Keep replies concise (under 100 words).
Never diagnose. Always recommend consulting the doctor for serious concerns.
Respond in the same language the patient uses.`,
    },
    // Anthropic model name — doctor change කරන්න පුළුවන්
    model: {
      type:    String,
      default: 'claude-sonnet-4-20250514',
    },
    // FAQ match confidence minimum % — ඊට වඩා අඩු ලේ Claude API use කරනවා
    faqConfidenceThreshold: {
      type:    Number,
      default: 60,
      min:     0,
      max:     100,
    },
    // Off-hours window (HH:MM format, 24h)
    offHoursStart: {
      type:    String,
      default: '18:00',
    },
    offHoursEnd: {
      type:    String,
      default: '08:00',
    },
    // ── Escalation Rules ──────────────────────────────────────
    // Bot eken pass karanna epa keywords — mese one match unoth
    // auto-reply eka නවත්තලා doctor ට alert එකක් යවනවා
    escalationEnabled: {
      type:    Boolean,
      default: true,
    },
    escalationKeywords: {
      type:    [String],
      default: ['emergency', 'suicidal', 'chest pain', 'overdose'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BotSettings', botSettingsSchema);