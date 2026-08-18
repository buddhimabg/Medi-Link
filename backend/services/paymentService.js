const crypto = require('crypto');
const Appointment = require('../models/appointment');
const Payment = require('../models/payment');
const Doctor = require('../models/doctor');
const Notification = require('../models/notification');
const DoctorSchedule = require('../models/doctorSchedule');
const invoiceService = require('./invoiceService');

/**
 * Generate PayHere sandbox/live payment details and MD5 secure signature.
 */
const generatePaymentConfig = async (appointmentId, amount, user, doctorName, protocol, host) => {
  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
  if (!merchantId || !merchantSecret) {
    throw new Error("PAYHERE_MERCHANT_ID / PAYHERE_MERCHANT_SECRET are not set in the environment.");
  }
  const formattedAmount = parseFloat(amount).toFixed(2);
  const currency = 'LKR';

  // Generate MD5 signature
  const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
  const rawHashString = merchantId + appointmentId.toString() + formattedAmount + currency + hashedSecret;
  const paymentHash = crypto.createHash('md5').update(rawHashString).digest('hex').toUpperCase();



  // Create initial pending payment entry
  await Payment.create({
    appointmentId,
    amount,
    currency,
    status: 'Pending'
  });

  return {
    sandbox: process.env.PAYHERE_SANDBOX !== 'false',
    merchant_id: merchantId,
    order_id: appointmentId.toString(),
    items: `Appointment with ${doctorName.startsWith('Dr') ? doctorName : `Dr. ${doctorName}`}`,
    amount: formattedAmount,
    currency: currency,
    hash: paymentHash,
    first_name: (user && user.name) ? user.name.split(' ')[0] : 'Patient',
    last_name: (user && user.name && user.name.split(' ').length > 1) ? user.name.split(' ').slice(1).join(' ') : 'User',
    email: (user && user.email) ? user.email : 'patient@example.com',
    phone: (user && user.mobile) ? user.mobile : '0771234567',
    address: 'No 1, Galle Road',
    city: (user && user.city) ? user.city : 'Colombo',
    country: 'Sri Lanka',
    notify_url: `${protocol}://${host}/api/payments/payhere-notify`,
    return_url: `${protocol}://${host}/appointments/success`,
    cancel_url: `${protocol}://${host}/appointments/cancel`
  };
};

/**
 * Build the patient-facing booking confirmation message, including the
 * hospital name for Physical appointments.
 */
const formatConfirmationMessage = (appointment) => {
  const [dateStr, ...timeParts] = appointment.slot.split(' ');
  const timeStr = timeParts.join(' ');
  const formattedDate = new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const locationPart = appointment.type === 'Physical' && appointment.hospital
    ? ` at ${appointment.hospital}`
    : '';

  return `Your ${appointment.type} appointment with ${appointment.doctorName} is confirmed for ${formattedDate} at ${timeStr}${locationPart}. Amount Paid: Rs. ${appointment.amount}.00 via PayHere.`;
};

/**
 * Verify incoming webhook MD5 signature.
 */
const verifySignature = (body) => {
  const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = body;
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
  if (!merchantSecret) {
    throw new Error("PAYHERE_MERCHANT_SECRET is not set in the environment.");
  }
  
  const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
  const localSigString = merchant_id + order_id + payhere_amount + payhere_currency + status_code + hashedSecret;
  const localSig = crypto.createHash('md5').update(localSigString).digest('hex').toUpperCase();

  return localSig === md5sig;
};

/**
 * Handle notification callback and update database records accordingly.
 */
const handleNotifyCallback = async (body) => {
  const {
    order_id,
    payment_id,
    payhere_amount,
    status_code,
    method,
    card_holder_name,
    card_masked
  } = body;

  // 1. Verify integrity of the callback signature
  if (!verifySignature(body)) {
    throw new Error("MD5 signature verification failed.");
  }

  // 2. Locate the appointment and its transaction log
  const appointment = await Appointment.findById(order_id);
  if (!appointment) {
    throw new Error(`Appointment not found: ${order_id}`);
  }

  // Find or create transaction record
  let paymentLog = await Payment.findOne({ appointmentId: order_id });
  if (!paymentLog) {
    paymentLog = new Payment({ appointmentId: order_id, amount: appointment.amount });
  }

  paymentLog.paymentId = payment_id;
  if (method) paymentLog.method = method;
  if (card_holder_name) paymentLog.cardHolderName = card_holder_name;
  if (card_masked) paymentLog.cardMasked = card_masked;

  // status_code "2" represents success
  if (status_code === '2') {
    paymentLog.status = 'Success';
    await paymentLog.save();

    if (appointment.paymentStatus !== 'Paid') {
      appointment.paymentStatus = 'Paid';
      if (card_holder_name) appointment.cardHolderName = card_holder_name;
      if (card_masked) appointment.cardNumber = card_masked;
      await appointment.save();

      // Trigger notification
      try {
        await Notification.create({
          userId: appointment.userId,
          title: "Appointment Confirmed",
          message: formatConfirmationMessage(appointment),
          type: "system",
          category: "appointment"
        });
      } catch (notifError) {
        console.error("Failed to create confirmation notification:", notifError);
      }

      // Physical appointments get an emailed confirmation + invoice PDF.
      // Wired here too, not just in confirmPayment, since PayHere's
      // server-to-server webhook can be the first (or only) path to mark
      // the appointment Paid depending on timing.
      invoiceService.sendPhysicalInvoiceEmail(appointment._id);
    }
    return { success: true, message: "Payment processed successfully." };
  } else {
    // Payment failed or was canceled
    paymentLog.status = status_code === '-1' ? 'Canceled' : 'Failed';
    await paymentLog.save();

    appointment.paymentStatus = status_code === '-1' ? 'Canceled' : 'Failed';
    await appointment.save();

    // Release slot back to doctor
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

    return { success: false, message: `Payment failed with status code ${status_code}. Slot restored.` };
  }
};

module.exports = {
  generatePaymentConfig,
  verifySignature,
  handleNotifyCallback,
  formatConfirmationMessage
};
