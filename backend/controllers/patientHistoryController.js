// backend/controllers/patientHistoryController.js
const PatientHistory = require('../models/PatientHistory');
const User           = require('../models/user');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/patient-history/session/:sessionId
// History record for one session
// ─────────────────────────────────────────────────────────────────────────────
exports.getHistoryBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const record = await PatientHistory.findOne({ sessionId });
    if (!record) {
      return res.status(404).json({ success: false, message: 'No history found for this session.' });
    }

    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    console.error('❌ getHistoryBySession error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/patient-history/:patientId
// All session history for a patient — sorted latest first
// Used by PatientHistoryPage + LiveCallScreen sidebar
// ─────────────────────────────────────────────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const { patientId } = req.params;

    const records = await PatientHistory.find({ patientId })
      .sort({ date: -1 });

    // Fetch patient name from User model — no hardcoding
    let patientName = null;
    try {
      const patient = await User.findById(patientId, 'name');
      patientName   = patient?.name || null;
    } catch { /* non-blocking */ }

    // Attach patientName to each record for frontend convenience
    const enriched = records.map(r => ({
      ...r.toObject(),
      patientName: patientName || `Patient #${patientId.slice(-4).toUpperCase()}`,
    }));

    return res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    console.error('❌ getHistory error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/patient-history
// Save a completed session snapshot
// ─────────────────────────────────────────────────────────────────────────────
exports.saveHistory = async (req, res) => {
  try {
    const { patientId, sessionId, notes, medications, moodLabel, moodColor } = req.body;
    const doctorId = req.user.id;

    if (!patientId || !sessionId) {
      return res.status(400).json({ success: false, message: 'patientId and sessionId are required.' });
    }

    // Upsert — avoid duplicates for same session
    const record = await PatientHistory.findOneAndUpdate(
      { sessionId },
      {
        patientId,
        sessionId,
        doctorId,
        notes:       notes       || '',
        medications: medications || [],
        moodLabel:   moodLabel   || 'Unknown',
        moodColor:   moodColor   || '#9CA3AF',
        date:        new Date(),
      },
      { upsert: true, new: true }
    );

    console.log(`✅ PatientHistory saved — session: ${sessionId}, patient: ${patientId}`);
    return res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('❌ saveHistory error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};