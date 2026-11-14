const mongoose = require('mongoose');

const JournalSchema = new mongoose.Schema({
  doctorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:      { type: String, required: true },
  category:   { type: String, required: true },
  summary:    { type: String, default: '' },
  content:    { type: String, default: '' },
  tags:       [{ type: String }],
  visibility: { type: String, default: 'All My Patients' },
  status:     { type: String, enum: ['Published', 'Draft'], default: 'Draft' },
  fileName:   { type: String, default: '' },
  fileUrl:    { type: String, default: '' },
  fileSize:   { type: String, default: '' },
  views:      { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Journal', JournalSchema);