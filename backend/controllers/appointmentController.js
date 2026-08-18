const PDFDocument = require('pdfkit');
const Appointment = require('../models/appointment');
const Doctor = require('../models/doctor');
const User = require('../models/user');
const Payment = require('../models/payment');
const DoctorSchedule = require('../models/doctorSchedule');
const paymentService = require('../services/paymentService');
const invoiceService = require('../services/invoiceService');

// Flat service charge kept back on every no-show-refund cancellation.
const NO_SHOW_FEE = 275;

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
      hospital,
      amount,
      doctorFee,
      hospitalFee,
      channelingFee,
      noShowRefund
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
      doctorId,
      doctorName: doctorName || doctor.name,
      specialty: specialty || doctor.specialty,
      credentials: credentials || (doctor.qualifications ? doctor.qualifications.join(', ') : ''),
      type,
      imageUrl: imageUrl || doctor.photo || doctor.imageUrl,
      slot,
      hospital: type === 'Physical' ? hospital : undefined,
      amount,
      doctorFee,
      hospitalFee,
      channelingFee,
      noShowRefund: !!noShowRefund,
      noShowFee: noShowRefund ? NO_SHOW_FEE : 0,
      paymentStatus: 'Pending'
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
    const appointments = await Appointment.find(query).sort({ createdAt: -1 }).lean();

    // Virtual appointments join a per-doctor video room keyed off the
    // doctor's own User._id (see App.tsx's buildSessionId), which is a
    // different id than Appointment.doctorId (the Doctor directory
    // record's own _id) — so resolve that link here for the "Join Call"
    // button on the patient dashboard.
    const doctorIds = [...new Set(appointments.map((a) => a.doctorId?.toString()).filter(Boolean))];
    const doctors = await Doctor.find({ _id: { $in: doctorIds } }, 'userId').lean();
    const doctorUserIdById = new Map(doctors.map((d) => [d._id.toString(), d.userId ? d.userId.toString() : null]));

    const data = appointments.map((a) => ({
      ...a,
      doctorUserId: doctorUserIdById.get(a.doctorId?.toString()) || null,
    }));

    res.status(200).json(data);
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

    // Enforce 24-hour cancellation validation check — waived for bookings
    // that opted into No Show Refund, since covering late cancellations /
    // missed sessions (minus the flat service charge) is the whole point
    // of that add-on.
    const apptDate = parseSlotStringToDate(appointment.slot);
    const now = new Date();
    const hoursDiff = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursDiff < 24 && !appointment.noShowRefund) {
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

    // 3. Mark appointment as canceled & issue automatic refund if paid.
    // No Show Refund bookings keep back the flat NO_SHOW_FEE service
    // charge; everyone else gets a full refund (subject to the 24h policy
    // enforced above).
    const wasPaid = appointment.paymentStatus === 'Paid';
    const refundAmount = appointment.noShowRefund
      ? Math.max(appointment.amount - NO_SHOW_FEE, 0)
      : appointment.amount;
    appointment.paymentStatus = 'Canceled';
    await appointment.save();

    if (wasPaid) {
      console.log(`[REFUND] Automatically refunded Rs. ${refundAmount}.00 for appointment ${appointment._id} to user card`);

      try {
        const Payment = require('../models/payment');
        const paymentLog = await Payment.findOne({ appointmentId: appointment._id });
        if (paymentLog) {
          paymentLog.status = 'Refunded';
          paymentLog.refundAmount = refundAmount;
          await paymentLog.save();
        }
      } catch (payErr) {
        console.warn("Could not update payment log to Refunded:", payErr);
      }
    }

    try {
      const Notification = require('../models/notification');
      const refundNote = wasPaid
        ? appointment.noShowRefund
          ? ` An automatic refund of Rs. ${refundAmount}.00 has been credited back to your card (Rs. ${NO_SHOW_FEE}.00 No Show Refund service charge withheld).`
          : ` An automatic refund of Rs. ${refundAmount}.00 has been credited back to your card.`
        : '';
      await Notification.create({
        userId: appointment.userId,
        title: "Appointment Canceled",
        message: `Your appointment with ${appointment.doctorName} on ${appointment.slot} has been canceled.${refundNote}`,
        type: "alert",
        category: "appointment"
      });
    } catch (notifyErr) {
      console.warn("Could not create cancellation notification:", notifyErr);
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
    const previousSlot = appointment.slot;
    appointment.slot = newSlot;
    appointment.paymentStatus = 'Paid'; // Ensure it's marked as active paid
    await appointment.save();

    try {
      const Notification = require('../models/notification');
      await Notification.create({
        userId: appointment.userId,
        title: "Appointment Rescheduled",
        message: `Your appointment with ${appointment.doctorName} has been moved from ${previousSlot} to ${newSlot}.`,
        type: "system",
        category: "appointment"
      });
    } catch (notifyErr) {
      console.warn("Could not create reschedule notification:", notifyErr);
    }

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
          message: paymentService.formatConfirmationMessage(appointment),
          type: "system",
          category: "appointment"
        });
      } catch (err) {
        console.warn("Notification creation failed:", err);
      }

      // Physical appointments get an emailed confirmation + invoice PDF.
      // Fire-and-forget: this never throws (errors are logged internally)
      // and shouldn't hold up the API response.
      invoiceService.sendPhysicalInvoiceEmail(appointment._id);
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

const getInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }
    if (appointment.paymentStatus !== 'Paid') {
      return res.status(400).json({ success: false, message: "Invoice is only available for paid appointments." });
    }

    await invoiceService.streamInvoiceToResponse(appointment, res);
  } catch (error) {
    console.error("Error generating invoice:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Server error generating invoice." });
    }
  }
};

module.exports = {
  createAppointment,
  getAppointments,
  cancelAppointment,
  getInvoice,
  rescheduleAppointment,
  confirmPayment
};
