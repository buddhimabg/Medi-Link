const Reminder = require('../models/reminder');

/**
 * Parses appointment slot string (e.g. "2026-08-25 10:00 AM" or "2026-08-25 14:30")
 * into YYYY-MM-DD date and HH:mm 24-hour time.
 */
const parseSlotToDateAndTime = (slotStr) => {
  if (!slotStr) return { date: null, time: "09:00" };
  const parts = slotStr.trim().split(" ");
  const dateStr = parts[0];
  let timeStr = "09:00";

  if (parts.length >= 2) {
    const rawTime = parts[1];
    const ampm = parts[2] ? parts[2].toUpperCase() : null;
    let [hours, minutes] = rawTime.split(":").map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
  }

  return { date: dateStr, time: timeStr };
};

/**
 * Creates or updates an appointment reminder in the Reminder collection.
 */
const syncAppointmentReminder = async (appointment) => {
  try {
    if (!appointment || !appointment.userId || !appointment.slot) return null;

    const { date: dateStr, time: timeStr } = parseSlotToDateAndTime(appointment.slot);
    if (!dateStr) return null;

    const title = `Dr. ${appointment.doctorName} Appointment`;
    const description = `${appointment.type || 'Physical'} appointment with Dr. ${appointment.doctorName}${appointment.specialty ? ` (${appointment.specialty})` : ''}`;
    const instruction = `Slot: ${appointment.slot}`;

    // Find existing reminder for this user and doctor appointment
    const existing = await Reminder.findOne({
      userId: appointment.userId,
      category: 'appointment',
      title: title,
    });

    if (existing) {
      existing.date = dateStr;
      existing.time = timeStr;
      existing.instruction = instruction;
      existing.description = description;
      existing.isActive = true;
      await existing.save();
      return existing;
    }

    const reminder = await Reminder.create({
      userId: appointment.userId,
      title,
      description,
      instruction,
      category: 'appointment',
      time: timeStr,
      frequency: 'once',
      date: dateStr,
      createdFrom: 'system',
      isActive: true,
    });

    return reminder;
  } catch (error) {
    console.error("Failed to sync appointment reminder:", error?.message || error);
    return null;
  }
};

/**
 * Deactivates or removes an appointment reminder if the appointment is canceled.
 */
const removeAppointmentReminder = async (appointment) => {
  try {
    if (!appointment || !appointment.userId) return;

    const title = `Dr. ${appointment.doctorName} Appointment`;
    await Reminder.deleteMany({
      userId: appointment.userId,
      category: 'appointment',
      title: title,
    });
  } catch (error) {
    console.error("Failed to remove appointment reminder:", error?.message || error);
  }
};

module.exports = {
  syncAppointmentReminder,
  removeAppointmentReminder,
};
