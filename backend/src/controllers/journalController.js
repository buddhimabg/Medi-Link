const Journal = require('../models/Journal');

// සියලුම ලිපි ලබා ගැනීම
exports.getJournals = async (req, res) => {
  try {
    const journals = await Journal.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: journals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// එක් ලිපියක් පමණක් ලබා ගැනීම (View සහ Edit සඳහා)
exports.getJournalById = async (req, res) => {
  try {
    const journal = await Journal.findById(req.params.id);
    if (!journal) return res.status(404).json({ success: false, message: "Article not found" });
    res.status(200).json({ success: true, data: journal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// අලුත් ලිපියක් නිර්මාණය
exports.createJournal = async (req, res) => {
  try {
    const { doctorId, title, category, summary, status } = req.body;
    const tags = req.body.tags ? JSON.parse(req.body.tags) : [];

    const newJournal = new Journal({
      doctorId,
      title,
      category,
      summary,
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

// ලිපියක් Update කිරීම
exports.updateJournal = async (req, res) => {
  try {
    const updatedJournal = await Journal.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.status(200).json({ success: true, data: updatedJournal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ලිපියක් මැකීම
exports.deleteJournal = async (req, res) => {
  try {
    await Journal.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Article deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};