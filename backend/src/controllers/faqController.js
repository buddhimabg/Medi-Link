// src/controllers/faqController.js
// Doctor ලට FAQ library manage කරන්නට — CRUD
const FAQ = require('../models/FAQ');

// ─────────────────────────────────────────────────────────────
// GET /api/chat/faqs
// Doctor ගේ සියලු FAQs (active + inactive)
// Query: ?category=MEDICATION&active=true
// ─────────────────────────────────────────────────────────────
exports.getFAQs = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const filter   = { doctorId };

    if (req.query.category) filter.category = req.query.category;
    if (req.query.active !== undefined) filter.isActive = req.query.active === 'true';

    const faqs = await FAQ.find(filter).sort({ usageCount: -1, createdAt: -1 });
    return res.status(200).json({ success: true, data: faqs });
  } catch (error) {
    console.error('❌ getFAQs error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/chat/faqs/:id
// Single FAQ fetch
// ─────────────────────────────────────────────────────────────
exports.getFAQById = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const faq      = await FAQ.findOne({ _id: req.params.id, doctorId });

    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found.' });
    }
    return res.status(200).json({ success: true, data: faq });
  } catch (error) {
    console.error('❌ getFAQById error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/chat/faqs
// New FAQ create කරනවා
// Body: { question, answer, keywords[], category }
// ─────────────────────────────────────────────────────────────
exports.createFAQ = async (req, res) => {
  try {
    const doctorId                           = req.user.id;
    const { question, answer, keywords, category } = req.body;

    if (!question?.trim() || !answer?.trim()) {
      return res.status(400).json({ success: false, message: 'question and answer are required.' });
    }

    const faq = await FAQ.create({
      doctorId,
      question: question.trim(),
      answer:   answer.trim(),
      keywords: Array.isArray(keywords) ? keywords.map(k => k.trim().toLowerCase()) : [],
      category: category || 'GENERAL',
    });

    console.log(`✅ FAQ created — doctor: ${doctorId}, id: ${faq._id}`);
    return res.status(201).json({ success: true, data: faq });
  } catch (error) {
    console.error('❌ createFAQ error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/chat/faqs/:id
// FAQ update කරනවා
// Body: { question?, answer?, keywords?, category?, isActive? }
// ─────────────────────────────────────────────────────────────
exports.updateFAQ = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const allowed  = ['question', 'answer', 'keywords', 'category', 'isActive'];
    const updates  = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // Keywords lowercase normalize
    if (Array.isArray(updates.keywords)) {
      updates.keywords = updates.keywords.map(k => k.trim().toLowerCase());
    }

    const faq = await FAQ.findOneAndUpdate(
      { _id: req.params.id, doctorId },
      updates,
      { new: true }
    );

    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found.' });
    }

    console.log(`✅ FAQ updated — id: ${faq._id}`);
    return res.status(200).json({ success: true, data: faq });
  } catch (error) {
    console.error('❌ updateFAQ error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/chat/faqs/:id
// FAQ delete කරනවා (hard delete)
// ─────────────────────────────────────────────────────────────
exports.deleteFAQ = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const faq      = await FAQ.findOneAndDelete({ _id: req.params.id, doctorId });

    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found.' });
    }

    console.log(`✅ FAQ deleted — id: ${req.params.id}`);
    return res.status(200).json({ success: true, message: 'FAQ deleted successfully.' });
  } catch (error) {
    console.error('❌ deleteFAQ error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/chat/faqs/:id/toggle
// isActive toggle — quick enable/disable without full update
// ─────────────────────────────────────────────────────────────
exports.toggleFAQ = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const faq      = await FAQ.findOne({ _id: req.params.id, doctorId });

    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found.' });
    }

    faq.isActive = !faq.isActive;
    await faq.save();

    console.log(`✅ FAQ toggled — id: ${faq._id}, isActive: ${faq.isActive}`);
    return res.status(200).json({ success: true, data: faq });
  } catch (error) {
    console.error('❌ toggleFAQ error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};