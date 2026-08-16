const fs = require('fs');
const path = require('path');
const Journal = require('../models/Journal');

// සියලුම ලිපි ලබා ගැනීම (pagination + search + filter සමඟ)
// Doctor කෙනෙක් නම් තමන්ගේ articles විතරයි, Patient කෙනෙක් නම් Published articles විතරයි
exports.getJournals = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const { search, category, status } = req.query;

    const query = {};

    if (req.user.role === 'doctor') {
      query.doctorId = req.user.id; // doctor ට තමන්ගේ articles විතරයි පේන්නේ
      if (status) query.status = status;
    } else {
      query.status = 'Published'; // patients ට Published articles විතරයි පේන්නේ
    }

    if (category) query.category = category;

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: regex }, { summary: regex }, { tags: regex }];
    }

    const total = await Journal.countDocuments(query);
    const journals = await Journal.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: journals,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// එක් ලිපියක් පමණක් ලබා ගැනීම (View සහ Edit සඳහා)
exports.getJournalById = async (req, res) => {
  try {
    const journal = await Journal.findById(req.params.id);
    if (!journal) return res.status(404).json({ success: false, message: "Article not found" });

    const isOwner = req.user && journal.doctorId.toString() === req.user.id;

    // Owner (doctor) තමන්ගේම article එක බලනකොට views count වෙන්න එපා —
    // Published articles patient කෙනෙක් / වෙන කෙනෙක් බලනකොට විතරක් count කරනවා
    if (journal.status === 'Published' && !isOwner) {
      journal.views = (journal.views || 0) + 1;
      await journal.save();
    }

    res.status(200).json({ success: true, data: journal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// අලුත් ලිපියක් නිර්මාණය (doctorId token එකෙන් ගන්නවා, body එකෙන් trust කරන්නේ නෑ)
exports.createJournal = async (req, res) => {
  try {
    const { title, category, summary, content, status } = req.body;
    const tags = req.body.tags ? JSON.parse(req.body.tags) : [];

    const newJournal = new Journal({
      doctorId: req.user.id,
      title,
      category,
      summary,
      content: content || '',
      tags,
      status: status || 'Published',
      fileUrl: req.file ? `/uploads/${req.file.filename}` : '',
      fileName: req.file ? req.file.originalname : '',
      fileSize: req.file ? `${(req.file.size / (1024 * 1024)).toFixed(2)} MB` : ''
    });

    await newJournal.save();
    res.status(201).json({ success: true, data: newJournal });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ලිපියක් Update කිරීම (owner ට විතරයි)
exports.updateJournal = async (req, res) => {
  try {
    const journal = await Journal.findById(req.params.id);
    if (!journal) return res.status(404).json({ success: false, message: "Article not found" });

    if (journal.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "You can only edit your own articles." });
    }

    // doctorId සහ views වගේ protected fields client එකෙන් override වෙන්න බෑ
    const { doctorId, views, ...allowedUpdates } = req.body;

    const updatedJournal = await Journal.findByIdAndUpdate(
      req.params.id,
      allowedUpdates,
      { new: true, runValidators: true }
    );
    res.status(200).json({ success: true, data: updatedJournal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ලිපියක් මැකීම (owner ට විතරයි) — file එකකුත් තියෙනවා නම් disk එකෙනුත් අයින් කරනවා
exports.deleteJournal = async (req, res) => {
  try {
    const journal = await Journal.findById(req.params.id);
    if (!journal) return res.status(404).json({ success: false, message: "Article not found" });

    if (journal.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "You can only delete your own articles." });
    }

    if (journal.fileUrl) {
      const filePath = path.join(__dirname, '../../', journal.fileUrl);
      fs.unlink(filePath, (err) => {
        if (err && err.code !== 'ENOENT') console.error('File delete error:', err.message);
      });
    }

    await Journal.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Article deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
