// src/utils/channeledPatients.js
// Shared helper — vishista controllers dekakma (conversationController,
// botController) me function eka use karana nisa, circular require ekk
// vලක්වන්න wenama file ekakata extract kalaa.
const mongoose     = require('mongoose');
const Doctor       = require('../models/doctor');
const Appointment  = require('../models/appointment');
const User         = require('../models/user');

// Regex special characters (., +, *, etc.) escape karanna — email
// ekee "." wage character ekk "any char" widihata regex eke misuse
// wenna epa
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ─────────────────────────────────────────────────────────────
// Logged-in doctor (User._id) ට Doctor-directory profile එක සොයාගන්නවා.
// Doctor directory eke "flat"/seed records (booking flow eken hadapu,
// admin-approval flow eken pass nowuna) valata `userId` field eka set
// wela na — e nisa `userId` witharak check kaloth patient 0k pennanawa,
// Conversation/Appointment records ættatama DB eke tibbath.
//
// userId field eka doctors collection ekee String widihata da, ObjectId
// widihata da save wela kiyala guarantee ekak na (data seed/migration
// flows wenas wenas ekathu unu nisa) — ithin dekama try karanawa.
// ─────────────────────────────────────────────────────────────
const findDoctorProfile = async (doctorUserId) => {
  const byUserIdString = await Doctor.findOne({ userId: doctorUserId }, '_id userId');
  if (byUserIdString) return byUserIdString;

  if (mongoose.Types.ObjectId.isValid(doctorUserId)) {
    const byUserIdObjectId = await Doctor.findOne(
      { userId: new mongoose.Types.ObjectId(doctorUserId) },
      '_id userId'
    );
    if (byUserIdObjectId) return byUserIdObjectId;
  }

  const doctorUser = await User.findById(doctorUserId, 'email');
  if (!doctorUser?.email) return null;

  return Doctor.findOne(
    { email: { $regex: `^${escapeRegex(doctorUser.email.trim())}$`, $options: 'i' } },
    '_id userId'
  );
};

// ─────────────────────────────────────────────────────────────
// Logged-in doctor (User._id) ට channeled (Paid appointment tibba)
// patient User._id ලැයිස්තුව හොයාගන්නවා.
// Appointment.doctorId eka Doctor(directory) collection ekee _id ekක්
// (User._id ekක් nemei), ithin Doctor profile eka harahaa bridge karanawa.
//
// Appointment.doctorId eka Mixed type nisa (booking flow ObjectId
// widihata da, video-call queue flow eke String widihata da save
// wenna puluwan) — dekama try karanawa. paymentStatus eka waga
// case-insensitive widihata check karanawa ("Paid" / "paid" / "PAID").
// ─────────────────────────────────────────────────────────────
const getChanneledPatientIds = async (doctorUserId) => {
  const doctorProfile = await findDoctorProfile(doctorUserId);
  if (!doctorProfile) return [];

  const doctorProfileIdStr = doctorProfile._id.toString();

  const appointments = await Appointment.find(
    {
      $or: [
        { doctorId: doctorProfile._id },
        { doctorId: doctorProfileIdStr },
      ],
      paymentStatus: { $regex: '^paid$', $options: 'i' },
    },
    'userId'
  ).lean();

  return [...new Set(appointments.map(a => a.userId))].filter(Boolean);
};

module.exports = { getChanneledPatientIds };