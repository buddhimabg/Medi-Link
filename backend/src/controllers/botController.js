// src/controllers/botController.js
// FAQ keyword match → Claude API fallback AI auto-reply logic
const https        = require('https');
const FAQ          = require('../models/FAQ');
const BotSettings  = require('../models/BotSettings');
const Message      = require('../models/Message');
const Conversation = require('../models/Conversation');
const Broadcast    = require('../models/Broadcast');
const User         = require('../models/User');

// ─────────────────────────────────────────────────────────────
// LAYER 1: FAQ Keyword Match
// Patient message ලේ keywords scan කරලා best match FAQ return
// ─────────────────────────────────────────────────────────────
const findFAQMatch = async (doctorId, patientMessage) => {
  const faqs = await FAQ.find({ doctorId, isActive: true });
  if (faqs.length === 0) return null;

  const msgLower  = patientMessage.toLowerCase();
  const msgWords  = msgLower.split(/\s+/);

  let bestMatch   = null;
  let bestScore   = 0;

  for (const faq of faqs) {
    if (!faq.keywords?.length) continue;

    const keywordsLower = faq.keywords.map(k => k.toLowerCase());
    let matchedCount    = 0;

    for (const kw of keywordsLower) {
      if (msgLower.includes(kw)) matchedCount++;
    }

    // Score = matched keywords / total keywords * 100
    const score = Math.round((matchedCount / keywordsLower.length) * 100);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = faq;
    }
  }

  return bestScore > 0 ? { faq: bestMatch, confidence: bestScore } : null;
};

// ─────────────────────────────────────────────────────────────
// LAYER 2: Claude API Call
// FAQ miss ලේ — Anthropic API call කරනවා
// ─────────────────────────────────────────────────────────────
const callClaudeAPI = (systemPrompt, conversationHistory, patientMessage, model) => {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return reject(new Error('ANTHROPIC_API_KEY not set in .env'));
    }

    // Recent history (last 6 messages for context)
    const messages = [
      ...conversationHistory.slice(-6).map(m => ({
        role:    m.senderRole === 'doctor' ? 'assistant' : 'user',
        content: m.text,
      })),
      { role: 'user', content: patientMessage },
    ];

    const body = JSON.stringify({
      model:      model || 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system:     systemPrompt,
      messages,
    });

    const options = {
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers:  {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          const text = parsed.content?.[0]?.text || '';
          resolve(text.trim());
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

// ─────────────────────────────────────────────────────────────
// Off-hours check helper
// ─────────────────────────────────────────────────────────────
const isOffHours = (start, end) => {
  const now   = new Date();
  const hhmm  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  // Handles midnight cross (e.g. 18:00 to 08:00)
  if (start > end) return hhmm >= start || hhmm < end;
  return hhmm >= start && hhmm < end;
};

// ─────────────────────────────────────────────────────────────
// MAIN: triggerAutoReply
// sendMessage controller ලේ patient message ලේ call වෙනවා
// ─────────────────────────────────────────────────────────────
exports.triggerAutoReply = async ({ conversationId, doctorId, patientMessage, io }) => {
  // 1) Bot settings ලෝඩ් කරනවා
  let settings = await BotSettings.findOne({ doctorId });
  if (!settings) {
    // First time — default settings create කරනවා
    settings = await BotSettings.create({ doctorId });
  }

  // 2) Bot active check
  if (!settings.isActive || settings.autoReplyMode === 'never') return;

  // 3) Off-hours mode check
  if (
    settings.autoReplyMode === 'off_hours' &&
    !isOffHours(settings.offHoursStart, settings.offHoursEnd)
  ) return;

  let replyText    = null;
  let replyType    = 'ai-auto';
  let confidence   = 0;
  let faqId        = null;
  let relatedFAQs  = [];

  // 4) Layer 1 — FAQ keyword match
  const faqResult = await findFAQMatch(doctorId, patientMessage);

  if (faqResult && faqResult.confidence >= settings.faqConfidenceThreshold) {
    replyText  = faqResult.faq.answer;
    replyType  = 'faq';
    confidence = faqResult.confidence;
    faqId      = faqResult.faq._id;

    // FAQ usage count increment
    await FAQ.findByIdAndUpdate(faqId, { $inc: { usageCount: 1 } });

    // Related FAQs — same category, same doctor, different FAQ
    const related = await FAQ.find({
      doctorId,
      isActive:  true,
      category:  faqResult.faq.category,
      _id:       { $ne: faqId },
    }).limit(2);
    relatedFAQs = related.map(f => f._id);

  } else {
    // 5) Layer 2 — Claude API fallback
    try {
      // Recent conversation history (context)
      const history = await Message.find({ conversationId })
        .sort({ createdAt: -1 })
        .limit(10);
      history.reverse();

      replyText  = await callClaudeAPI(
        settings.systemPrompt,
        history,
        patientMessage,
        settings.model
      );
      replyType  = 'ai-auto';
      confidence = 85; // Claude reply ලේ fixed high confidence
    } catch (err) {
      console.error('⚠️  Claude API error — skipping auto reply:', err.message);
      return; // API fail ලා → no bot reply
    }
  }

  if (!replyText) return;

  // 6) Bot message save
  const botMessage = await Message.create({
    conversationId,
    senderId:    `bot_${doctorId}`,
    senderRole:  'bot',
    text:        replyText,
    type:        replyType,
    aiConfidence: confidence,
    faqId:       faqId || null,
    relatedFAQs,
  });

  // 7) Conversation last message update
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage:    replyText.slice(0, 100),
    lastMessageAt:  new Date(),
    lastSenderRole: 'bot',
  });

  // 8) Socket.io emit — real-time
  if (io) {
    io.to(`chat:${conversationId}`).emit('new-message', {
      conversationId,
      message: botMessage,
    });
  }

  console.log(`🤖 Auto-replied (${replyType}, ${confidence}%) → conv: ${conversationId}`);
};

// ─────────────────────────────────────────────────────────────
// POST /api/chat/ai-reply
// Doctor ලට AI suggestion ලබා ගන්නට (send නොකර) — "Get AI Suggestion" button
// Body: { conversationId, patientMessage }
// ─────────────────────────────────────────────────────────────
exports.getAISuggestion = async (req, res) => {
  try {
    const { conversationId, patientMessage } = req.body;
    const doctorId = req.user.id;

    if (!patientMessage?.trim()) {
      return res.status(400).json({ success: false, message: 'patientMessage required.' });
    }

    let settings = await BotSettings.findOne({ doctorId });
    if (!settings) settings = await BotSettings.create({ doctorId });

    let suggestion   = null;
    let type         = 'ai-auto';
    let confidence   = 0;

    // FAQ match
    const faqResult = await findFAQMatch(doctorId, patientMessage);
    if (faqResult && faqResult.confidence >= settings.faqConfidenceThreshold) {
      suggestion = faqResult.faq.answer;
      type       = 'faq';
      confidence = faqResult.confidence;
    } else {
      // Claude API
      const history = await Message.find({ conversationId })
        .sort({ createdAt: -1 }).limit(8);
      history.reverse();

      suggestion = await callClaudeAPI(
        settings.systemPrompt,
        history,
        patientMessage,
        settings.model
      );
      type       = 'ai-auto';
      confidence = 85;
    }

    return res.status(200).json({ success: true, data: { suggestion, type, confidence } });
  } catch (error) {
    console.error('❌ getAISuggestion error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/chat/bot-settings
// ─────────────────────────────────────────────────────────────
exports.getBotSettings = async (req, res) => {
  try {
    const doctorId = req.user.id;
    let settings   = await BotSettings.findOne({ doctorId });
    if (!settings)  settings = await BotSettings.create({ doctorId });
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error('❌ getBotSettings error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/chat/bot-settings
// Body: { isActive, autoReplyMode, systemPrompt, model, ... }
// ─────────────────────────────────────────────────────────────
exports.updateBotSettings = async (req, res) => {
  try {
    const doctorId  = req.user.id;
    const allowed   = [
      'isActive', 'autoReplyMode', 'systemPrompt', 'model',
      'faqConfidenceThreshold', 'offHoursStart', 'offHoursEnd',
    ];
    const updates   = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const settings = await BotSettings.findOneAndUpdate(
      { doctorId },
      updates,
      { new: true, upsert: true }
    );

    console.log(`✅ BotSettings updated for doctor: ${doctorId}`);
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error('❌ updateBotSettings error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/chat/broadcast
// Doctor ලා select කළ patients ලට bulk message
// Body: { message, patientIds: [] }
// ─────────────────────────────────────────────────────────────
exports.sendBroadcast = async (req, res) => {
  try {
    const doctorId              = req.user.id;
    const { message, patientIds } = req.body;

    if (!message?.trim() || !Array.isArray(patientIds) || patientIds.length === 0) {
      return res.status(400).json({ success: false, message: 'message and patientIds required.' });
    }

    // Broadcast record save
    const broadcast = await Broadcast.create({
      doctorId,
      message:        message.trim(),
      recipients:     patientIds,
      deliveredCount: patientIds.length,
    });

    // Per-patient conversation ලේ message create
    const io = req.app.get('io');
    const senderName = req.user.name || 'Doctor';

    await Promise.all(
      patientIds.map(async (patientId) => {
        let conv = await Conversation.findOne({ doctorId, patientId });
        if (!conv) conv = await Conversation.create({ doctorId, patientId });

        const msg = await Message.create({
          conversationId: conv._id,
          senderId:       doctorId,
          senderRole:     'doctor',
          text:           message.trim(),
          type:           'normal',
        });

        await Conversation.findByIdAndUpdate(conv._id, {
          lastMessage:    message.trim().slice(0, 100),
          lastMessageAt:  new Date(),
          lastSenderRole: 'doctor',
          unreadCount:    0,
        });

        if (io) {
          io.to(`chat:${conv._id}`).emit('new-message', {
            conversationId: conv._id,
            message: msg,
          });
        }
      })
    );

    console.log(`📣 Broadcast sent to ${patientIds.length} patients by doctor: ${doctorId}`);
    return res.status(201).json({ success: true, data: broadcast });
  } catch (error) {
    console.error('❌ sendBroadcast error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/chat/broadcast
// Doctor ගේ broadcast history
// ─────────────────────────────────────────────────────────────
exports.getBroadcasts = async (req, res) => {
  try {
    const doctorId   = req.user.id;
    const broadcasts = await Broadcast.find({ doctorId }).sort({ sentAt: -1 });
    return res.status(200).json({ success: true, data: broadcasts });
  } catch (error) {
    console.error('❌ getBroadcasts error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/chat/analytics
// Dashboard stats — total messages, unread, AI replied, FAQ queries
// ─────────────────────────────────────────────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    const doctorId = req.user.id;

    // Doctor ගේ conversations
    const convIds = (
      await Conversation.find({ doctorId }, '_id')
    ).map(c => c._id);

    const [
      totalMessages,
      unreadCount,
      aiReplied,
      faqReplied,
      topFAQs,
      recentBroadcasts,
    ] = await Promise.all([
      Message.countDocuments({ conversationId: { $in: convIds } }),
      Conversation.aggregate([
        { $match: { doctorId } },
        { $group: { _id: null, total: { $sum: '$unreadCount' } } },
      ]),
      Message.countDocuments({ conversationId: { $in: convIds }, type: 'ai-auto' }),
      Message.countDocuments({ conversationId: { $in: convIds }, type: 'faq'     }),
      FAQ.find({ doctorId, isActive: true }).sort({ usageCount: -1 }).limit(5),
      Broadcast.find({ doctorId }).sort({ sentAt: -1 }).limit(5),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalMessages,
        unreadCount:    unreadCount[0]?.total || 0,
        aiReplied,
        faqReplied,
        topFAQs:        topFAQs.map(f => ({
          label:   f.question.slice(0, 50),
          count:   f.usageCount,
          category: f.category,
        })),
        recentBroadcasts,
      },
    });
  } catch (error) {
    console.error('❌ getAnalytics error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};