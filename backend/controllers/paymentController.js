const paymentService = require('../services/paymentService');
const Appointment = require('../models/appointment');
const Doctor = require('../models/doctor');
const Payment = require('../models/payment');
const DoctorSchedule = require('../models/doctorSchedule');

/**
 * Endpoint for server-to-server callback (IPN) webhook from PayHere
 */
const payhereNotify = async (req, res) => {
  try {
    console.log("PayHere webhook notification received:", req.body);
    const result = await paymentService.handleNotifyCallback(req.body);
    
    if (result.success) {
      return res.status(200).send(result.message);
    } else {
      return res.status(200).send(result.message); // still 200 for PayHere to acknowledge receipt
    }
  } catch (error) {
    console.error("Error in payhereNotify controller:", error.message);
    return res.status(400).send(error.message || "Internal server error during notification processing.");
  }
};

/**
 * Endpoint to poll or check the payment status of an appointment
 */
const checkPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }
    
    // Fetch related payment log details if any
    const paymentLog = await Payment.findOne({ appointmentId: id });

    res.status(200).json({
      success: true,
      paymentStatus: appointment.paymentStatus,
      appointment,
      paymentLog
    });
  } catch (error) {
    console.error("Error checking payment status:", error);
    res.status(500).json({ success: false, message: "Server error checking status." });
  }
};

/**
 * Endpoint to cancel a pending payment and delete the reserved appointment slot
 */
const cancelAppointmentPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }

    if (appointment.paymentStatus === 'Pending') {
      // Restore doctor availability slot
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

      const doctor = await Doctor.findById(appointment.doctorId);
      if (doctor) {
        if (!doctor.availableSlots.includes(appointment.slot)) {
          const newSlots = [...doctor.availableSlots, appointment.slot];
          await Doctor.findByIdAndUpdate(appointment.doctorId, { $set: { availableSlots: newSlots } });
        }
      }

      // Update payment status log if exists
      const paymentLog = await Payment.findOne({ appointmentId: id });
      if (paymentLog) {
        paymentLog.status = 'Canceled';
        await paymentLog.save();
      }

      // Delete the pending appointment
      await Appointment.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: "Payment canceled. Booking deleted and slot restored successfully."
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel appointment that is already ${appointment.paymentStatus}.`
      });
    }
  } catch (error) {
    console.error("Error canceling appointment payment:", error);
    res.status(500).json({ success: false, message: "Server error during cancellation." });
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: "Missing userId parameter." });
    }

    // 1. Find all appointments for the user
    const appointments = await Appointment.find({ userId });
    const appointmentIds = appointments.map(appt => appt._id);

    // 2. Find all payments for these appointments
    const payments = await Payment.find({ appointmentId: { $in: appointmentIds } })
      .populate('appointmentId')
      .sort({ createdAt: -1 });

    // 3. Map payments to history elements
    const history = payments.map(pay => {
      const appt = pay.appointmentId;
      return {
        _id: pay._id,
        appointmentId: appt ? appt._id : null,
        paymentId: pay.paymentId || "N/A",
        amount: pay.status === 'Refunded' && pay.refundAmount != null ? pay.refundAmount : pay.amount,
        currency: pay.currency,
        status: pay.status,
        method: pay.method || "PayHere Gateway",
        cardMasked: pay.cardMasked || "•••• ••••",
        date: pay.createdAt,
        doctorName: appt ? appt.doctorName : "Doctor Consultation",
        specialty: appt ? appt.specialty : "Medical Service",
        slot: appt ? appt.slot : "N/A"
      };
    });

    res.status(200).json(history);
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({ success: false, message: "Server error loading payment history." });
  }
};

module.exports = {
  payhereNotify,
  checkPaymentStatus,
  cancelAppointmentPayment,
  getPaymentHistory
};
