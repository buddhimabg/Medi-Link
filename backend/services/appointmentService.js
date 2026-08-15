const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const SystemActivity = require('../models/SystemActivity');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const { logger } = require('../middleware/logger');

/**
 * Appointment Service
 * Handles all appointment-related business logic
 */

/**
 * Get all appointments with filters
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Records per page
 * @returns {Promise<Object>} Appointments list and metadata
 */
exports.getAllAppointments = async (filters = {}, page = 1, limit = 10) => {
  try {
    let query = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.doctorId) {
      query.doctorId = filters.doctorId;
    }

    if (filters.patientId) {
      query.patientId = filters.patientId;
    }

    if (filters.startDate && filters.endDate) {
      query.appointmentDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }

    const skip = (page - 1) * limit;

    const appointments = await Appointment.find(query)
      .populate('doctorId', 'specialization')
      .populate('patientId', 'name')
      .sort({ appointmentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(query);

    logger.debug(`Retrieved ${appointments.length} appointments`);

    return {
      appointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error(`Get all appointments error: ${error.message}`);
    throw error;
  }
};

/**
 * Get appointment by ID
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<Object>} Appointment details
 */
exports.getAppointmentById = async (appointmentId) => {
  try {
    const appointment = await Appointment.findById(appointmentId)
      .populate('doctorId')
      .populate('patientId');

    if (!appointment) {
      throw new NotFoundError('Appointment');
    }

    logger.debug(`Retrieved appointment: ${appointmentId}`);

    return appointment;
  } catch (error) {
    logger.error(`Get appointment by ID error: ${error.message}`);
    throw error;
  }
};

/**
 * Create appointment
 * @param {Object} appointmentData - Appointment data
 * @param {string} userId - User creating appointment
 * @returns {Promise<Object>} Created appointment
 */
exports.createAppointment = async (appointmentData, userId) => {
  try {
    const {
      doctorId,
      patientId,
      appointmentDate,
      startTime,
      endTime,
      consultationType,
      reason
    } = appointmentData;

    // Validate required fields
    if (!doctorId || !patientId || !appointmentDate) {
      throw new ValidationError('Doctor ID, Patient ID, and appointment date are required');
    }

    // Check if appointment slot is available
    const existingAppointment = await Appointment.findOne({
      doctorId,
      appointmentDate: {
        $gte: new Date(appointmentDate).setHours(0, 0, 0, 0),
        $lt: new Date(appointmentDate).setHours(23, 59, 59, 999)
      },
      status: { $in: ['scheduled', 'completed'] }
    });

    if (existingAppointment && startTime === existingAppointment.startTime) {
      throw new ValidationError('This appointment slot is already booked');
    }

    const appointment = new Appointment({
      doctorId,
      patientId,
      appointmentDate,
      startTime,
      endTime,
      consultationType: consultationType || 'in-person',
      reason,
      status: 'scheduled'
    });

    await appointment.save();

    // Log activity
    await new SystemActivity({
      userId,
      activityType: 'appointment_scheduled',
      description: 'New appointment scheduled'
    }).save();

    const populatedAppointment = await appointment
      .populate('doctorId', 'specialization')
      .populate('patientId', 'name email');

    logger.info(`Appointment created`, { appointmentId: appointment._id });

    return populatedAppointment;
  } catch (error) {
    logger.error(`Create appointment error: ${error.message}`);
    throw error;
  }
};

/**
 * Update appointment
 * @param {string} appointmentId - Appointment ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated appointment
 */
exports.updateAppointment = async (appointmentId, updateData) => {
  try {
    const { appointmentDate, startTime, endTime, consultationType, reason } = updateData;

    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        appointmentDate: appointmentDate || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        consultationType: consultationType || undefined,
        reason: reason || undefined
      },
      { new: true }
    ).populate('doctorId').populate('patientId');

    if (!appointment) {
      throw new NotFoundError('Appointment');
    }

    logger.info(`Appointment updated`, { appointmentId });

    return appointment;
  } catch (error) {
    logger.error(`Update appointment error: ${error.message}`);
    throw error;
  }
};

/**
 * Update appointment status
 * @param {string} appointmentId - Appointment ID
 * @param {string} status - New status
 * @param {string} notes - Additional notes
 * @param {string} userId - User updating status
 * @returns {Promise<Object>} Updated appointment
 */
exports.updateAppointmentStatus = async (appointmentId, status, notes, userId) => {
  try {
    const validStatuses = ['scheduled', 'completed', 'cancelled', 'no-show'];

    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        status,
        notes: notes || undefined
      },
      { new: true }
    ).populate('doctorId').populate('patientId');

    if (!appointment) {
      throw new NotFoundError('Appointment');
    }

    // Log activity
    if (status === 'completed') {
      await new SystemActivity({
        userId,
        activityType: 'appointment_completed',
        description: 'Appointment marked as completed'
      }).save();
    }

    logger.info(`Appointment status updated`, { appointmentId, status });

    return appointment;
  } catch (error) {
    logger.error(`Update appointment status error: ${error.message}`);
    throw error;
  }
};

/**
 * Cancel appointment
 * @param {string} appointmentId - Appointment ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} Cancelled appointment
 */
exports.cancelAppointment = async (appointmentId, reason) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        status: 'cancelled',
        notes: reason || 'Cancelled by user'
      },
      { new: true }
    ).populate('doctorId').populate('patientId');

    if (!appointment) {
      throw new NotFoundError('Appointment');
    }

    logger.info(`Appointment cancelled`, { appointmentId });

    return appointment;
  } catch (error) {
    logger.error(`Cancel appointment error: ${error.message}`);
    throw error;
  }
};

/**
 * Delete appointment
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<void>}
 */
exports.deleteAppointment = async (appointmentId) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(appointmentId);

    if (!appointment) {
      throw new NotFoundError('Appointment');
    }

    logger.info(`Appointment deleted`, { appointmentId });
  } catch (error) {
    logger.error(`Delete appointment error: ${error.message}`);
    throw error;
  }
};

/**
 * Get appointment statistics
 * @returns {Promise<Object>} Appointment statistics
 */
exports.getAppointmentStatistics = async () => {
  try {
    const total = await Appointment.countDocuments();
    const completed = await Appointment.countDocuments({ status: 'completed' });
    const scheduled = await Appointment.countDocuments({ status: 'scheduled' });
    const cancelled = await Appointment.countDocuments({ status: 'cancelled' });
    const noShow = await Appointment.countDocuments({ status: 'no-show' });

    logger.debug(`Retrieved appointment statistics`);

    return {
      total,
      completed,
      scheduled,
      cancelled,
      noShow,
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) : 0
    };
  } catch (error) {
    logger.error(`Get appointment statistics error: ${error.message}`);
    throw error;
  }
};

/**
 * Check if time slot is available
 * @param {string} doctorId - Doctor ID
 * @param {Date} appointmentDate - Appointment date
 * @param {string} startTime - Start time
 * @returns {Promise<boolean>} True if available
 */
exports.isTimeSlotAvailable = async (doctorId, appointmentDate, startTime) => {
  try {
    const appointment = await Appointment.findOne({
      doctorId,
      appointmentDate: {
        $gte: new Date(appointmentDate).setHours(0, 0, 0, 0),
        $lt: new Date(appointmentDate).setHours(23, 59, 59, 999)
      },
      startTime,
      status: { $in: ['scheduled', 'completed'] }
    });

    return !appointment;
  } catch (error) {
    logger.error(`Check time slot availability error: ${error.message}`);
    throw error;
  }
};

/**
 * Get doctor available slots
 * @param {string} doctorId - Doctor ID
 * @param {Date} date - Date to check
 * @returns {Promise<Array>} Available time slots
 */
exports.getDoctorAvailableSlots = async (doctorId, date) => {
  try {
    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
      throw new NotFoundError('Doctor');
    }

    // Get all appointments for this date
    const appointments = await Appointment.find({
      doctorId,
      appointmentDate: {
        $gte: new Date(date).setHours(0, 0, 0, 0),
        $lt: new Date(date).setHours(23, 59, 59, 999)
      },
      status: { $in: ['scheduled', 'completed'] }
    });

    // Generate available slots (9 AM to 5 PM, 30-minute intervals)
    const availableSlots = [];
    const bookedSlots = appointments.map(apt => apt.startTime);

    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        if (!bookedSlots.includes(timeString)) {
          availableSlots.push(timeString);
        }
      }
    }

    return availableSlots;
  } catch (error) {
    logger.error(`Get doctor available slots error: ${error.message}`);
    throw error;
  }
};