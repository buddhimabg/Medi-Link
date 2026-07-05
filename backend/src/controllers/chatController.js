// backend/src/controllers/chatController.js
// Handles: recent messages list for a doctor (used by dashboard & AllChats page)

const Message      = require('../models/Message');
const Conversation = require('../models/Conversation');
const mongoose     = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/recent-messages
// Returns the most recent message per conversation for the logged-in doctor.
// Used by: ChatbotDashboard (Recent Patient Messages section)
// ─────────────────────────────────────────────────────────────────────────────
const getRecentMessages = async (req, res) => {
  try {
    const doctorId = req.user._id.toString();
    const limit    = parseInt(req.query.limit) || 10;

    // 1. Find all conversations that belong to this doctor
    const conversations = await Conversation.find({ doctorId })
      .sort({ lastMessageAt: -1 })
      .limit(limit)
      .populate('patientId', 'name email profilePicture')
      .lean();

    if (!conversations.length) {
      return res.status(200).json({ success: true, messages: [] });
    }

    // 2. For each conversation, grab the latest message
    const convIds = conversations.map(c => c._id);

    const latestMessages = await Message.aggregate([
      { $match: { conversationId: { $in: convIds } } },
      { $sort:  { createdAt: -1 } },
      {
        $group: {
          _id:          '$conversationId',
          text:         { $first: '$text' },
          senderRole:   { $first: '$senderRole' },
          type:         { $first: '$type' },
          isRead:       { $first: '$isRead' },
          createdAt:    { $first: '$createdAt' },
        },
      },
    ]);

    // 3. Map latest messages back onto conversations
    const msgMap = {};
    latestMessages.forEach(m => { msgMap[m._id.toString()] = m; });

    const result = conversations.map(conv => {
      const patient = conv.patientId || {};
      const msg     = msgMap[conv._id.toString()] || {};
      return {
        conversationId:  conv._id,
        patientId:       patient._id   || conv.patientId,
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
    console.error('[chatController] getRecentMessages error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching messages.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/conversations/:id/messages?page=1&limit=30
// Paginated message history for one conversation
// ─────────────────────────────────────────────────────────────────────────────
const getMessages = async (req, res) => {
  try {
    const { id }  = req.params;
    const page    = parseInt(req.query.page)  || 1;
    const limit   = parseInt(req.query.limit) || 30;
    const skip    = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID.' });
    }

    const [messages, total] = await Promise.all([
      Message.find({ conversationId: id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments({ conversationId: id }),
    ]);

    return res.status(200).json({
      success: true,
      messages: messages.reverse(), // oldest first for chat display
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    });

  } catch (error) {
    console.error('[chatController] getMessages error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching messages.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat/conversations/:id/messages
// Send a message (doctor typing manually)
// Body: { text }
// ─────────────────────────────────────────────────────────────────────────────
const sendMessage = async (req, res) => {
  try {
    const { id }   = req.params;
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID.' });
    }

    const senderRole = req.user.role; // 'doctor' | 'patient'

    // 1. Create the message
    const message = await Message.create({
      conversationId: id,
      senderId:       req.user._id.toString(),
      senderRole,
      text:           text.trim(),
      type:           'normal',
      isRead:         false,
    });

    // 2. Update conversation's lastMessage snapshot
    await Conversation.findByIdAndUpdate(id, {
      lastMessage:    text.trim(),
      lastSenderRole: senderRole,
      lastMessageAt:  new Date(),
      // If doctor is sending, reset unread for doctor's side
      ...(senderRole === 'doctor' ? {} : { $inc: { unreadCount: 1 } }),
    });

    return res.status(201).json({ success: true, message });

  } catch (error) {
    console.error('[chatController] sendMessage error:', error);
    return res.status(500).json({ success: false, message: 'Server error sending message.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/chat/conversations/:id/read
// Mark all patient messages in a conversation as read (doctor opens chat)
// ─────────────────────────────────────────────────────────────────────────────
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID.' });
    }

    await Promise.all([
      // Mark all patient/bot messages as read
      Message.updateMany(
        { conversationId: id, senderRole: { $in: ['patient', 'bot'] }, isRead: false },
        { $set: { isRead: true } }
      ),
      // Reset unread count on conversation
      Conversation.findByIdAndUpdate(id, { unreadCount: 0 }),
    ]);

    return res.status(200).json({ success: true, message: 'Messages marked as read.' });

  } catch (error) {
    console.error('[chatController] markAsRead error:', error);
    return res.status(500).json({ success: false, message: 'Server error marking messages read.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/conversations/with/:patientId
// Get or create a conversation between logged-in doctor + a patient
// ─────────────────────────────────────────────────────────────────────────────
const getOrCreateConversation = async (req, res) => {
  try {
    const doctorId  = req.user._id.toString();
    const { patientId } = req.params;

    let conv = await Conversation.findOne({ doctorId, patientId })
      .populate('patientId', 'name email profilePicture');

    if (!conv) {
      conv = await Conversation.create({
        doctorId,
        patientId,
        lastMessage:    '',
        lastSenderRole: 'patient',
        lastMessageAt:  new Date(),
        unreadCount:    0,
      });
      conv = await conv.populate('patientId', 'name email profilePicture');
    }

    return res.status(200).json({ success: true, conversation: conv });

  } catch (error) {
    console.error('[chatController] getOrCreateConversation error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/conversations
// All conversations for the logged-in doctor (unread count + last message)
// ─────────────────────────────────────────────────────────────────────────────
const getConversations = async (req, res) => {
  try {
    const doctorId = req.user._id.toString();

    const conversations = await Conversation.find({ doctorId })
      .sort({ lastMessageAt: -1 })
      .populate('patientId', 'name email profilePicture')
      .lean();

    // Shape data to match frontend ConversationRecord type
    const result = conversations.map(conv => ({
      _id:            conv._id,
      patientId:      conv.patientId?._id || conv.patientId,
      patient:        {
        name:          conv.patientId?.name   || 'Unknown Patient',
        email:         conv.patientId?.email  || '',
        profilePicture: conv.patientId?.profilePicture || null,
      },
      lastMessage:    conv.lastMessage    || '',
      lastSenderRole: conv.lastSenderRole || 'patient',
      lastMessageAt:  conv.lastMessageAt  || conv.updatedAt,
      unreadCount:    conv.unreadCount    || 0,
    }));

    return res.status(200).json({ success: true, conversations: result });

  } catch (error) {
    console.error('[chatController] getConversations error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching conversations.' });
  }
};

module.exports = {
  getRecentMessages,
  getMessages,
  sendMessage,
  markAsRead,
  getOrCreateConversation,
  getConversations,
};