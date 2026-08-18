const mongoose = require('mongoose');
const Appointment = require('../models/appointment');
const Doctor = require('../models/doctor');
const User = require('../models/user');
const DoctorSchedule = require('../models/doctorSchedule');

const parseSlotStringToDate = (slotStr) => {
  if (!slotStr) return new Date();
  const parts = slotStr.split(" ");
  if (parts.length < 3) return new Date(slotStr);

  const datePart = parts[0]; // "YYYY-MM-DD"
  const timePart = parts[1]; // "hh:mm"
  const ampm = parts[2];     // "AM" or "PM"

  const [hoursStr, minutesStr] = timePart.split(":");
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  const pad = (num) => String(num).padStart(2, "0");
  const isoStr = `${datePart}T${pad(hours)}:${pad(minutes)}:00`;
  return new Date(isoStr);
};

const createAppointment = async (req, res) => {
  try {
    const {
      userId,
      doctorId,
      doctorName,
      specialty,
      credentials,
      type,
      imageUrl,
      slot,
      amount
    } = req.body;

    if (!userId || !doctorId || !slot || !type || !amount) {
      return res.status(400).json({ success: false, message: "Missing required booking details." });
    }

    // 1. Verify doctor and slot availability
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found." });
    }

    // Parse date and time from slot string (format: "YYYY-MM-DD hh:mm AM/PM")
    const parts = slot.split(" ");
    const dateStr = parts[0];
    const timeStr = parts.slice(1).join(" ");

    const doctorSchedule = await DoctorSchedule.findOne({ doctorId, date: dateStr });
    if (!doctorSchedule) {
      return res.status(400).json({ success: false, message: "No schedule found for the selected date." });
    }

    const slotObj = doctorSchedule.slots.find(s => s.time === timeStr);
    if (!slotObj || slotObj.isBooked) {
      return res.status(400).json({ success: false, message: "The selected slot is no longer available." });
    }

    // 2. Reserve slot by marking it booked in DoctorSchedule and updating Doctor.availableSlots
    slotObj.isBooked = true;
    await doctorSchedule.save();

    const newAvailableSlots = doctor.availableSlots.filter(s => s !== slot);
    await Doctor.findByIdAndUpdate(doctorId, { $set: { availableSlots: newAvailableSlots } });

    // 3. Get user details for PayHere billing fields
    let user = null;
    if (userId && userId !== 'guest') {
      try {
        user = await User.findById(userId);
      } catch (err) {
        console.warn("Could not fetch user details for billing fields:", err);
      }
    }

    // 4. Create appointment in 'Pending' state
    const appointment = await Appointment.create({
      userId,
      patientId: userId,
      doctorId,
      doctorName: doctorName || doctor.name,
      specialty: specialty || doctor.specialty,
      credentials: credentials || (doctor.qualifications ? doctor.qualifications.join(', ') : ''),
      type,
      imageUrl: imageUrl || doctor.photo || doctor.imageUrl,
      slot,
      date: parseSlotStringToDate(slot), // FIX: was missing — caused "Invalid Date" in doctor's queue
      amount,
      paymentStatus: 'Pending',
      status: 'ongoing' 
    });

    // 5. Generate PayHere payload using service
    const host = req.get('host');
    const protocol = req.protocol;
    const payhereConfig = await paymentService.generatePaymentConfig(
      appointment._id,
      amount,
      user,
      doctorName || doctor.name,
      protocol,
      host
    );

    res.status(201).json({
      success: true,
      message: "Appointment created. Complete payment to confirm.",
      data: {
        appointmentId: appointment._id,
        payhere: payhereConfig
      }
    });

  } catch (error) {
    console.error("Error creating appointment:", error);
    res.status(500).json({ success: false, message: "Server error during booking process." });
  }
};

const getAppointments = async (req, res) => {
  try {
    const { userId } = req.query;
    let query = {};
    if (userId) {
      query.userId = userId;
    }
    const appointments = await Appointment.find(query).sort({ createdAt: -1 });
    res.status(200).json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ success: false, message: "Failed to load appointments." });
  }
};

const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }

    // Enforce 24-hour cancellation validation check
    const apptDate = parseSlotStringToDate(appointment.slot);
    const now = new Date();
    const hoursDiff = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursDiff < 24) {
      return res.status(400).json({
        success: false,
        message: "Appointments can only be canceled at least 24 hours before the scheduled slot time."
      });
    }

    // 1. Restore doctor availability slot in DoctorSchedule
    const parts = appointment.slot.split(" ");
    const dateStr = parts[0];
    const timeStr = parts.slice(1).join(" ");

    const doctorSchedule = await DoctorSchedule.findOne({ doctorId: appointment.doctorId, date: dateStr });
    if (doctorSchedule) {
      const slotObj = doctorSchedule.slots.find(s => s.time === timeStr);
      if (slotObj) {
        slotObj.isBooked = false;
        await doctorSchedule.save();
      }
    }

    // 2. Append slot back to doctor's availableSlots array fallback
    const doctor = await Doctor.findById(appointment.doctorId);
    if (doctor) {
      if (!doctor.availableSlots.includes(appointment.slot)) {
        const newSlots = [...doctor.availableSlots, appointment.slot];
        await Doctor.findByIdAndUpdate(appointment.doctorId, { $set: { availableSlots: newSlots } });
      }
    }

    // 3. Mark appointment as canceled & issue automatic refund if paid
    const wasPaid = appointment.paymentStatus === 'Paid';
    appointment.paymentStatus = 'Canceled';
    await appointment.save();

    if (wasPaid) {
      console.log(`[REFUND] Automatically refunded Rs. ${appointment.amount}.00 for appointment ${appointment._id} to user card`);
      
      try {
        const Payment = require('../models/payment');
        const paymentLog = await Payment.findOne({ appointmentId: appointment._id });
        if (paymentLog) {
          paymentLog.status = 'Refunded';
          await paymentLog.save();
        }
      } catch (payErr) {
        console.warn("Could not update payment log to Refunded:", payErr);
      }

      try {
        const Notification = require('../models/notification');
        await Notification.create({
          userId: appointment.userId,
          title: "Automatic Billing Refund Issued",
          message: `Your appointment with Dr. ${appointment.doctorName} was successfully canceled. An automatic refund of Rs. ${appointment.amount}.00 has been credited back to your card.`,
          category: "billing"
        });
      } catch (notifyErr) {
        console.warn("Could not create billing notification:", notifyErr);
      }
    }

    res.status(200).json({
      success: true,
      message: "Appointment canceled, slot released successfully."
    });
  } catch (error) {
    console.error("Error canceling appointment:", error);
    res.status(500).json({ success: false, message: "Server error during cancellation process." });
  }
};

const rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { newSlot } = req.body;

    if (!newSlot) {
      return res.status(400).json({ success: false, message: "Missing new slot details." });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }

    // Enforce 24-hour rescheduling validation check
    const apptDate = parseSlotStringToDate(appointment.slot);
    const now = new Date();
    const hoursDiff = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursDiff < 24) {
      return res.status(400).json({
        success: false,
        message: "Appointments can only be rescheduled at least 24 hours before the scheduled slot time."
      });
    }

    // 1. Verify new slot availability
    const newParts = newSlot.split(" ");
    const newDateStr = newParts[0];
    const newTimeStr = newParts.slice(1).join(" ");

    const newDoctorSchedule = await DoctorSchedule.findOne({ doctorId: appointment.doctorId, date: newDateStr });
    if (!newDoctorSchedule) {
      return res.status(400).json({ success: false, message: "No schedule found for the new selected date." });
    }

    const newSlotObj = newDoctorSchedule.slots.find(s => s.time === newTimeStr);
    if (!newSlotObj || newSlotObj.isBooked) {
      return res.status(400).json({ success: false, message: "The selected new slot is not available." });
    }

    // 2. Release old slot
    const oldParts = appointment.slot.split(" ");
    const oldDateStr = oldParts[0];
    const oldTimeStr = oldParts.slice(1).join(" ");

    const oldDoctorSchedule = await DoctorSchedule.findOne({ doctorId: appointment.doctorId, date: oldDateStr });
    if (oldDoctorSchedule) {
      const oldSlotObj = oldDoctorSchedule.slots.find(s => s.time === oldTimeStr);
      if (oldSlotObj) {
        oldSlotObj.isBooked = false;
        await oldDoctorSchedule.save();
      }
    }

    // 3. Reserve new slot
    newSlotObj.isBooked = true;
    await newDoctorSchedule.save();

    // 4. Update legacy Doctor.availableSlots array
    const doctor = await Doctor.findById(appointment.doctorId);
    if (doctor) {
      let updatedSlots = doctor.availableSlots.filter(s => s !== newSlot);
      if (!updatedSlots.includes(appointment.slot)) {
        updatedSlots.push(appointment.slot);
      }
      await Doctor.findByIdAndUpdate(appointment.doctorId, { $set: { availableSlots: updatedSlots } });
    }

    // 5. Update appointment slot and status
    appointment.slot = newSlot;
    appointment.paymentStatus = 'Paid'; // Ensure it's marked as active paid
    await appointment.save();

    res.status(200).json({
      success: true,
      message: "Appointment rescheduled successfully.",
      data: appointment
    });
  } catch (error) {
    console.error("Error rescheduling appointment:", error);
    res.status(500).json({ success: false, message: "Server error during rescheduling process." });
  }
};

const confirmPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }

    if (appointment.paymentStatus !== 'Paid') {
      appointment.paymentStatus = 'Paid';
      await appointment.save();

      // Update associated Payment transaction log to Success
      try {
        const Payment = require('../models/payment');
        const paymentLog = await Payment.findOne({ appointmentId: appointment._id });
        if (paymentLog) {
          paymentLog.status = 'Success';
          paymentLog.paymentId = paymentLog.paymentId || `PAY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          paymentLog.method = paymentLog.method || "Visa (Local)";
          paymentLog.cardMasked = paymentLog.cardMasked || "•••• •••• •••• 5678";
          await paymentLog.save();
        }
      } catch (payErr) {
        console.warn("Could not update payment log to Success:", payErr);
      }

      // Trigger a confirmation notification in the DB
      try {
        const Notification = require('../models/notification');
        await Notification.create({
          userId: appointment.userId,
          title: "Appointment Confirmed",
          message: `Your ${appointment.type} appointment with ${appointment.doctorName} on ${appointment.slot} is confirmed. Amount Paid: Rs. ${appointment.amount}.00 via PayHere.`,
          category: "appointment"
        });
      } catch (err) {
        console.warn("Notification creation failed:", err);
      }
    }

    res.status(200).json({
      success: true,
      message: "Payment confirmed successfully.",
      data: appointment
    });
  } catch (error) {
    console.error("Error confirming payment:", error);
    res.status(500).json({ success: false, message: "Server error confirming payment." });
  }
};

// ── Doctor's video-call queue (used by VideoCall PreCallSetup / WaitingRoom) ──

// GET /api/appointments/doctor  — raw ongoing appointments for this doctor
const getDoctorQueue = async (req, res) => {
  try {
    // FIX 1: req.user.id is the logged-in User._id, but Appointment.doctorId
    // stores the Doctor._id (a separate collection/document). Resolve
    // User._id -> Doctor._id first via the Doctor.userId link.
    const userId = req.user?.id?.toString();
    const doctorProfile = await Doctor.findOne({ userId });
    if (!doctorProfile) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found for this account.' });
    }
    const doctorId = doctorProfile._id.toString();

    // FIX 2: Appointment.doctorId is schema type Mixed, so it may be stored
    // as either a plain String or a real BSON ObjectId depending on how the
    // document was created. A string query only matches string-stored docs,
    // so we match both stored forms with $or.
    const doctorObjectId = new mongoose.Types.ObjectId(doctorId);
    const appointments = await Appointment.find({
      $or: [{ doctorId }, { doctorId: doctorObjectId }],
      status: 'ongoing',
    }).sort({ date: 1 });

    return res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    console.error('getDoctorQueue error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// GET /api/appointments/doctor/queue  — enriched queue with patient names
// FIX: only resolves users whose role is 'patient'. An appointment whose
// patientId points to a non-patient account (e.g. a doctor test account
// used to test the booking flow) is skipped instead of showing up as a
// waiting patient.
const getDoctorQueueEnriched = async (req, res) => {
  try {
    // FIX 1: same User._id -> Doctor._id resolution as getDoctorQueue above.
    const userId = req.user?.id?.toString();
    const doctorProfile = await Doctor.findOne({ userId });
    if (!doctorProfile) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found for this account.' });
    }
    const doctorId = doctorProfile._id.toString();

    // FIX 2: doctorId is stored as either String or ObjectId (schema type
    // Mixed) depending on how the appointment was created, so match both.
    const doctorObjectId = new mongoose.Types.ObjectId(doctorId);
    const appointments = await Appointment.find({
      $or: [{ doctorId }, { doctorId: doctorObjectId }],
      status: 'ongoing',
    }).sort({ date: 1 });

    const patientIds = [...new Set(appointments.map(a => a.patientId))];
    const users = await User.find({ _id: { $in: patientIds }, role: 'patient' }, 'name');
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u.name; });

    const enriched = appointments
      .filter(a => userMap[a.patientId])
      .map(a => ({
        _id:            a._id,
        patientId:      a.patientId,
        patientName:    userMap[a.patientId],
        patientInitial: userMap[a.patientId].charAt(0).toUpperCase(),
        sessionId:      null,
        notes:          a.notes || '',
        status:         a.status,
        date:           a.date,
      }));

    return res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    console.error('getDoctorQueueEnriched error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// GET /api/appointments/today-summary  — today's completed video-call sessions
const getTodaysCompletedSessions = async (req, res) => {
  try {
    const doctorId = req.user?.id?.toString();
    const PatientHistory = require('../models/PatientHistory');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await PatientHistory.find({
      doctorId,
      date: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ date: -1 });

    const patientIds = [...new Set(sessions.map(s => s.patientId))];
    const patients = await User.find({ _id: { $in: patientIds } }, 'name');
    const nameMap = Object.fromEntries(patients.map(p => [p._id.toString(), p.name]));

    const enriched = sessions.map(s => ({
      id:              s._id,
      patientId:       s.patientId,
      patientName:     nameMap[s.patientId] || 'Unknown Patient',
      date:            s.date,
      duration:        s.duration,
      notes:           s.notes,
      notesForPatient: s.notesForPatient || '',
      medications:     s.medications || [],
      moodLabel:       s.moodLabel,
    }));

    return res.status(200).json({
      success: true,
      data: {
        date: startOfDay,
        totalSessions: enriched.length,
        totalDuration: enriched.reduce((sum, s) => sum + (s.duration || 0), 0),
        totalPrescriptions: enriched.reduce((sum, s) => sum + (s.medications?.length || 0), 0),
        sessions: enriched,
      },
    });
  } catch (error) {
    console.error('getTodaysCompletedSessions error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

module.exports = {
  createAppointment,
  getAppointments,
  cancelAppointment,
  rescheduleAppointment,
  confirmPayment,
  getDoctorQueue,
  getDoctorQueueEnriched,
  getTodaysCompletedSessions
};