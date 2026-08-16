// src/controllers/conversationController.js
const Conversation    = require('../models/Conversation');
const Message         = require('../models/Message');
const User             = require('../models/user');
const PatientHistory   = require('../models/PatientHistory');
const Broadcast        = require('../models/Broadcast');
const VideoSession     = require('../models/VideoSession');
const { triggerAutoReply, checkEscalation } = require('./botController');

// ─────────────────────────────────────────────────────────────
// Helper — enrich conversation list with patient user info
// ─────────────────────────────────────────────────────────────
const enrichConversations = async (conversations) => {
  const patientIds = conversations.map(c => c.patientId);
  const patients   = await User.find(
    { _id: { $in: patientIds } },
    'name email role'
  );
  const patientMap = Object.fromEntries(patients.map(p => [p._id.toString(), p]));

  return conversations.map(c => ({
    ...c.toObject(),
    patient: patientMap[c.patientId] || { name: 'Unknown Patient' },
  }));
};

// ─────────────────────────────────────────────────────────────
// GET /api/chat/recent-messages?limit=5
// Dashboard "Recent Patient Messages" card සඳහා — per-conversation
// latest message + patient info එකට එකතු කරලා return කරනවා.
// NOTE: patientId field එක Conversation schema එකේ String එකක්
// (not a Mongoose ref), ඒ නිසා .populate() වැඩ නෑ — manual join කරනවා.
// ─────────────────────────────────────────────────────────────
exports.getRecentMessages = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const limit     = Math.min(50, parseInt(req.query.limit) || 10);

    const conversations = await Conversation.find({ doctorId, isArchived: false })
      .sort({ lastMessageAt: -1 })
      .limit(limit)
      .lean();

    if (!conversations.length) {
      return res.status(200).json({ success: true, messages: [] });
    }

    // Patient info manual join
    const patientIds = conversations.map(c => c.patientId);
    const patients    = await User.find(
      { _id: { $in: patientIds } },
      'name email profilePicture'
    ).lean();
    const patientMap  = Object.fromEntries(patients.map(p => [p._id.toString(), p]));

    // Latest message per conversation
    const convIds = conversations.map(c => c._id);
    const latestMessages = await Message.aggregate([
      { $match: { conversationId: { $in: convIds } } },
      { $sort:  { createdAt: -1 } },
      {
        $group: {
          _id:        '$conversationId',
          text:       { $first: '$text' },
          senderRole: { $first: '$senderRole' },
          type:       { $first: '$type' },
          isRead:     { $first: '$isRead' },
          createdAt:  { $first: '$createdAt' },
        },
      },
    ]);
    const msgMap = Object.fromEntries(latestMessages.map(m => [m._id.toString(), m]));

    const result = conversations.map(conv => {
      const patient = patientMap[conv.patientId] || {};
      const msg     = msgMap[conv._id.toString()] || {};
      return {
        conversationId:  conv._id,
        patientId:       conv.patientId,
        patientName:     patient.name  || 'Unknown Patient',
        patientEmail:    patient.email || '',
        patientAvatar:   patient.profilePicture || null,
        lastMessage:     msg.text       || conv.lastMessage || 'No messages yet',
        lastSenderRole:  msg.senderRole || conv.lastSenderRole || 'patient',
        lastMessageType: msg.type       || 'normal',
        isRead:          msg.isRead     ?? true,
        unreadCount:     conv.unreadCount || 0,
        lastMessageAt:   conv.lastMessageAt || conv.updatedAt,
      };
    });

    return res.status(200).json({ success: true, messages: result });
  } catch (error) {
    console.error('❌ getRecentMessages error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/chat/patients/:patientId/profile
// Chatbot "👤 Profile" button — real patient snapshot for the doctor:
// basic info (User) + session/medication history (PatientHistory)
// + chat stats (Conversation). No fabricated / hardcoded data.
// ─────────────────────────────────────────────────────────────
exports.getPatientProfile = async (req, res) => {
  try {
    const doctorId  = req.user.id;
    const { patientId } = req.params;

    const patient = await User.findOne(
      { _id: patientId, role: 'patient' },
      'name email phone age bloodType createdAt'
    );
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    // All past sessions for this patient with this doctor — latest first
    const history = await PatientHistory.find({ patientId, doctorId }).sort({ date: -1 });

    // De-duplicated medication list — most recent occurrence wins
    const seen = new Set();
    const recentMeds = [];
    for (const h of history) {
      for (const m of h.medications || []) {
        const key = m.name || JSON.stringify(m);
        if (!seen.has(key)) { seen.add(key); recentMeds.push(m); }
      }
    }

    const conversation = await Conversation.findOne({ doctorId, patientId });

    return res.status(200).json({
      success: true,
      data: {
        patient,
        sessionsCompleted: history.length,
        latestMood:        history[0]?.moodLabel || null,
        latestMoodColor:   history[0]?.moodColor || null,
        latestNote:        history[0]?.notes || '',
        recentMeds,
        history:           history.slice(0, 5),
        chat: conversation ? {
          unreadCount:   conversation.unreadCount,
          lastMessage:   conversation.lastMessage,
          lastMessageAt: conversation.lastMessageAt,
        } : null,
      },
    });
  } catch (error) {
    console.error('❌ getPatientProfile error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/chat/patients
// System එකේ registered patients ok list — "New Message" screen එකේ
// doctor ට patient කෙනෙක් සොයාගෙන අලුත් conversation ekක් පටන් ගන්න.
// (existing conversation එකක් තිබුනත් නැතත් — every registered patient)
// ─────────────────────────────────────────────────────────────
exports.getAllPatients = async (req, res) => {
  try {
    const patients = await User.find({ role: 'patient' }, 'name email phone')
      .sort({ name: 1 });
    return res.status(200).json({ success: true, data: patients });
  } catch (error) {
    console.error('❌ getAllPatients error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/chat/conversations
// Doctor ගේ සියලු conversations — last message + unread count
// ─────────────────────────────────────────────────────────────
exports.getConversations = async (req, res) => {
  try {
    const doctorId = req.user.id;

    const conversations = await Conversation.find({
      doctorId,
      isArchived: false,
    }).sort({ lastMessageAt: -1 });

    const enriched = await enrichConversations(conversations);

    return res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    console.error('❌ getConversations error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/chat/conversations/with/:patientId
// Patient id දෙනවා — existing conversation හොයනවා, නැත්නම් හදනවා
// ─────────────────────────────────────────────────────────────
exports.getOrCreateConversation = async (req, res) => {
  try {
    const doctorId  = req.user.id;
    const { patientId } = req.params;

    let conversation = await Conversation.findOne({ doctorId, patientId });

    if (!conversation) {
      conversation = await Conversation.create({ doctorId, patientId });
    }

    const patient = await User.findById(patientId, 'name email');
    return res.status(200).json({
      success: true,
      data:    { ...conversation.toObject(), patient },
    });
  } catch (error) {
    console.error('❌ getOrCreateConversation error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/chat/conversations/session/:sessionId
// Patient (or doctor) side — get or create the conversation tied to a
// video call session, without needing to already know the other
// party's user id. VideoSession already stores both doctorId and
// patientId (patientId is set once the patient calls /video/join-room),
// so we just look those up and reuse the same getOrCreate logic.
// Available to both roles (not doctor-only like the /with/:patientId
// route above), since the patient app has no other way to discover
// their doctor's id.
// ─────────────────────────────────────────────────────────────
exports.getConversationBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await VideoSession.findOne({ sessionId }, 'doctorId patientId');
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }
    if (!session.patientId) {
      return res.status(400).json({ success: false, message: 'No patient has joined this session yet.' });
    }

    const { doctorId, patientId } = session;

    let conversation = await Conversation.findOne({ doctorId, patientId });
    if (!conversation) {
      conversation = await Conversation.create({ doctorId, patientId });
    }

    return res.status(200).json({ success: true, data: conversation.toObject() });
  } catch (error) {
    console.error('❌ getConversationBySession error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/chat/conversations/:id/messages?page=1&limit=30
// Paginated message history
// ─────────────────────────────────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const { id }  = req.params;
    const page    = Math.max(1, parseInt(req.query.page)  || 1);
    const limit   = Math.min(100, parseInt(req.query.limit) || 30);
    const skip    = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find({ conversationId: id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('faqId', 'question category'),
      Message.countDocuments({ conversationId: id }),
    ]);

    // Oldest first ලේ return කරනවා (UI scroll order)
    return res.status(200).json({
      success: true,
      data: {
        messages: messages.reverse(),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ getMessages error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/chat/conversations/:id/messages
// Doctor හෝ Patient message send කරනවා
// Body: { text, senderRole? }
// ─────────────────────────────────────────────────────────────
exports.sendMessage = async (req, res) => {
  try {
    const { id }         = req.params;
    const { text }       = req.body;
    const senderId       = req.user.id;
    const senderRole     = req.user.role === 'doctor' ? 'doctor' : 'patient';

    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: 'text is required.' });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    // Patient eken message ekක් ewoth — e kalinma doctor/bot ekaー unread
    // messages tibba (e athare broadcast messages) "read" widihata mark
    // karanawa. Patient reply karanawa kiyanne e messages dæka thiyenawa
    // kiyana real signal ekක් — ithin Broadcast.readCount eka real widihata
    // update wenawa (patient-side chat UI ekක් one nætuwa).
    if (senderRole === 'patient') {
      const unreadFromDoctor = await Message.find({
        conversationId: id,
        senderRole:     { $in: ['doctor', 'bot'] },
        isRead:         false,
      }, '_id broadcastId');

      if (unreadFromDoctor.length) {
        await Message.updateMany(
          { _id: { $in: unreadFromDoctor.map(m => m._id) } },
          { isRead: true }
        );

        const broadcastIds = [...new Set(
          unreadFromDoctor.filter(m => m.broadcastId).map(m => m.broadcastId.toString())
        )];
        if (broadcastIds.length) {
          await Broadcast.updateMany(
            { _id: { $in: broadcastIds } },
            { $inc: { readCount: 1 } }
          );
        }
      }
    }

    // Message save කරනවා
    const message = await Message.create({
      conversationId: id,
      senderId,
      senderRole,
      text:           text.trim(),
      type:           'normal',
    });

    // Conversation last message update
    await Conversation.findByIdAndUpdate(id, {
      lastMessage:    text.trim().slice(0, 100),
      lastMessageAt:  new Date(),
      lastSenderRole: senderRole,
      // Doctor message ලේ unread reset; patient ගේ unread ++
      ...(senderRole === 'doctor'
        ? { unreadCount: 0 }
        : { $inc: { unreadCount: 1 } }
      ),
    });

    // Socket.io — real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${id}`).emit('new-message', { conversationId: id, message });
    }

    // Patient ගේ message ලේ → 1) escalation safety-gate check, 2) bot auto-reply
    if (senderRole === 'patient') {
      checkEscalation({
        conversationId: id,
        doctorId:       conversation.doctorId,
        patientMessage: text.trim(),
        io,
      })
        .then(escalated => {
          // Emergency keyword hamba unoth — AI/FAQ auto-reply eka SKIP
          // karanawa (deterministic safety message eka checkEscalation
          // eken already yawala thiyenne)
          if (!escalated) {
            return triggerAutoReply({
              conversationId: id,
              doctorId:       conversation.doctorId,
              patientMessage: text.trim(),
              io,
            });
          }
        })
        .catch(err => console.error('⚠️ escalation/autoReply error:', err));
    }

    return res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('❌ sendMessage error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/chat/conversations/:id/read
// Doctor conversation open කරද්දී unread count reset
// ─────────────────────────────────────────────────────────────
exports.markAsRead = async (req, res) => {
  try {
    const { id }   = req.params;
    const doctorId = req.user.id;

    await Promise.all([
      Conversation.findOneAndUpdate(
        { _id: id, doctorId },
        { unreadCount: 0, needsEscalation: false }
      ),
      Message.updateMany(
        { conversationId: id, senderRole: 'patient', isRead: false },
        { isRead: true }
      ),
    ]);

    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${id}`).emit('read-receipt', { conversationId: id, doctorId });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ markAsRead error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};