const Appointment = require('../models/appointment');
const Doctor = require('../models/Doctor');
const Notification = require('../models/notification');

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
      amount,
      cardHolderName,
      cardNumber
    } = req.body;

    if (!userId || !doctorId || !slot || !type || !amount) {
      return res.status(400).json({ success: false, message: "Missing required booking details." });
    }

    // 1. Verify doctor and slot availability
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found." });
    }

    if (!doctor.availableSlots.includes(slot)) {
      return res.status(400).json({ success: false, message: "The selected slot is no longer available." });
    }

    // 2. Simulate Payment Check
    if (!cardNumber || cardNumber.length < 16) {
      return res.status(400).json({ success: false, message: "Invalid card details. Payment failed." });
    }

    // 3. Remove slot from doctor availability
    doctor.availableSlots = doctor.availableSlots.filter(s => s !== slot);
    await doctor.save();

    // 4. Create appointment
    const appointment = await Appointment.create({
      userId,
      doctorId,
      doctorName: doctorName || doctor.name,
      specialty: specialty || doctor.specialty,
      credentials: credentials || (doctor.qualifications ? doctor.qualifications.join(', ') : ''),
      type,
      imageUrl: imageUrl || doctor.photo || doctor.imageUrl,
      slot,
      amount,
      cardHolderName,
      cardNumber: `xxxx-xxxx-xxxx-${cardNumber.slice(-4)}`
    });

    // 5. Trigger a notifications record
    try {
      await Notification.create({
        userId,
        title: "Appointment Confirmed",
        message: `Your ${type} appointment with ${doctorName || doctor.name} on ${slot} is confirmed. Amount Paid: Rs. ${amount}.00`,
        type: "system",
        category: "appointment"
      });
    } catch (notifError) {
      console.error("Failed to create confirmation notification:", notifError);
    }

    res.status(201).json({
      success: true,
      message: "Appointment booked and paid successfully!",
      data: appointment
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

module.exports = { createAppointment, getAppointments };
