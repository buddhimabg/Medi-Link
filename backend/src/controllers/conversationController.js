// src/controllers/conversationController.js
const Conversation = require('../models/Conversation');
const Message      = require('../models/Message');
const User         = require('../models/User');
const { triggerAutoReply } = require('./botController');

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

    // Patient ගේ message ලේ → bot auto-reply check (non-blocking)
    if (senderRole === 'patient') {
      triggerAutoReply({
        conversationId: id,
        doctorId:       conversation.doctorId,
        patientMessage: text.trim(),
        io,
      }).catch(err => console.error('⚠️ autoReply error:', err));
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
        { unreadCount: 0 }
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