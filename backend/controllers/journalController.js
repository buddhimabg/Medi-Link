const fs = require('fs');
const path = require('path');
const Journal = require('../models/Journal');
const Appointment = require('../models/appointment');
const Doctor = require('../models/doctor');
const User = require('../models/user');

// Patient කෙනෙක්ට appointment එකක් තියෙන doctor(ලා)ගේ login/User _id ටික
// ලබාගන්නවා — Journal.doctorId එකට compare කරන්න පුළුවන් id ටිකක් විදිහට.
//
// Chain: Appointment.userId (patient) -> Appointment.doctorId (Doctor
// directory _id) -> Doctor.userId (doctor's login/User _id).
//
// Doctor directory එකේ "flat" (seed/demo) records වලට userId set වෙලා නෑ,
// ඒ නිසා userId නැති ඒවාට Doctor.email <-> User.email match කරලා fallback
// එකක් විදිහට doctor ගේ login account එක සොයාගන්නවා.
const getLinkedDoctorUserIds = async (patientUserId) => {
  const appointmentDoctorIds = await Appointment.find({ userId: patientUserId }).distinct('doctorId');
  if (appointmentDoctorIds.length === 0) return [];

  const doctorDocs = await Doctor.find(
    { _id: { $in: appointmentDoctorIds } },
    'userId email'
  );

  const linkedIds = doctorDocs
    .filter((d) => d.userId)
    .map((d) => d.userId.toString());

  const emailsToResolve = doctorDocs
    .filter((d) => !d.userId && d.email)
    .map((d) => d.email.trim().toLowerCase());

  let resolvedByEmail = [];
  if (emailsToResolve.length > 0) {
    const matchingUsers = await User.find(
      { role: 'doctor' },
      '_id email'
    );
    resolvedByEmail = matchingUsers
      .filter((u) => emailsToResolve.includes((u.email || '').trim().toLowerCase()))
      .map((u) => u._id.toString());
  }

  return [...new Set([...linkedIds, ...resolvedByEmail])];
};

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
      // Patient ට පේන්න ඕන "තමන්ට appointment එකක් තියෙන doctor" upload කරපු
      // Published articles විතරයි — system එකේ ඉන්න ඕනම doctor කෙනෙක්ගේ නෙමෙයි.
      const linkedDoctorUserIds = await getLinkedDoctorUserIds(req.user.id);

      query.status = 'Published';
      query.doctorId = { $in: linkedDoctorUserIds }; // හිස් නම් articles 0ක් return වෙනවා
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

    // Patient කෙනෙක් නම්, direct link එකකින් ආවත්, තමන්ට appointment එකක්
    // නැති doctor කෙනෙක්ගේ article එකක් view කරන්න දෙන්නේ නෑ.
    if (req.user.role !== 'doctor' && !isOwner) {
      if (journal.status !== 'Published') {
        return res.status(404).json({ success: false, message: "Article not found" });
      }
      const linkedDoctorUserIds = await getLinkedDoctorUserIds(req.user.id);
      const isLinkedDoctor = linkedDoctorUserIds.includes(journal.doctorId.toString());
      if (!isLinkedDoctor) {
        return res.status(403).json({ success: false, message: "You can only view articles from doctors you have an appointment with." });
      }
    }

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