const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const SystemActivity = require('../models/SystemActivity');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const { logger } = require('../middleware/logger');

/**
 * Get all appointments
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllAppointments = async (req, res, next) => {
  try {
    const { status, doctorId, patientId, startDate, endDate, page = 1, limit = 10 } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    }

    if (doctorId) {
      query.doctorId = doctorId;
    }

    if (patientId) {
      query.patientId = patientId;
    }

    if (startDate && endDate) {
      query.appointmentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
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

    res.json({
      success: true,
      count: appointments.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: appointments
    });
  } catch (error) {
    logger.error(`Get all appointments error: ${error.message}`);
    next(error);
  }
};

/**
 * Get appointment by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctorId')
      .populate('patientId');

    if (!appointment) {
      return next(new NotFoundError('Appointment'));
    }

    logger.debug(`Retrieved appointment: ${req.params.id}`);

    res.json({
      success: true,
      data: appointment
    });
  } catch (error) {
    logger.error(`Get appointment by ID error: ${error.message}`);
    next(error);
  }
};

/**
 * Create appointment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createAppointment = async (req, res, next) => {
  try {
    const {
      doctorId,
      patientId,
      appointmentDate,
      startTime,
      endTime,
      consultationType,
      reason
    } = req.body;

    // Validate required fields
    if (!doctorId || !patientId || !appointmentDate) {
      return next(new ValidationError('Doctor ID, Patient ID, and appointment date are required'));
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
      return next(new ValidationError('This appointment slot is already booked'));
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
      userId: req.userId,
      activityType: 'appointment_scheduled',
      description: 'New appointment scheduled'
    }).save();

    const populatedAppointment = await appointment.populate('doctorId', 'specialization');
    await populatedAppointment.populate('patientId', 'name email');

    logger.info(`Appointment created`, { appointmentId: appointment._id });

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: populatedAppointment
    });
  } catch (error) {
    logger.error(`Create appointment error: ${error.message}`);
    next(error);
  }
};

/**
 * Update appointment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateAppointment = async (req, res, next) => {
  try {
    const { appointmentDate, startTime, endTime, consultationType, reason } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
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
      return next(new NotFoundError('Appointment'));
    }

    logger.info(`Appointment updated`, { appointmentId: req.params.id });

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: appointment
    });
  } catch (error) {
    logger.error(`Update appointment error: ${error.message}`);
    next(error);
  }
};

/**
 * Update appointment status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;

    if (!status) {
      return next(new ValidationError('Status is required'));
    }

    const validStatuses = ['scheduled', 'completed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(status)) {
      return next(new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`));
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      {
        status,
        notes: notes || undefined
      },
      { new: true }
    ).populate('doctorId').populate('patientId');

    if (!appointment) {
      return next(new NotFoundError('Appointment'));
    }

    // Log activity
    if (status === 'completed') {
      await new SystemActivity({
        userId: req.userId,
        activityType: 'appointment_completed',
        description: 'Appointment marked as completed'
      }).save();
    }

    logger.info(`Appointment status updated`, { appointmentId: req.params.id, status });

    res.json({
      success: true,
      message: 'Appointment status updated successfully',
      data: appointment
    });
  } catch (error) {
    logger.error(`Update appointment status error: ${error.message}`);
    next(error);
  }
};

/**
 * Cancel appointment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.cancelAppointment = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      {
        status: 'cancelled',
        notes: reason || 'Cancelled by user'
      },
      { new: true }
    ).populate('doctorId').populate('patientId');

    if (!appointment) {
      return next(new NotFoundError('Appointment'));
    }

    logger.info(`Appointment cancelled`, { appointmentId: req.params.id });

    // Log system activity
    try {
      await new SystemActivity({
        userId: req.userId,
        activityType: 'appointment_cancelled',
        description: `Appointment cancelled`,
        resourceType: 'Appointment',
        resourceId: req.params.id,
        status: 'success'
      }).save();
    } catch (actErr) {
      // Non-critical, don't fail the main operation
    }

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: appointment
    });
  } catch (error) {
    logger.error(`Cancel appointment error: ${error.message}`);
    next(error);
  }
};

/**
 * Delete appointment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);

    if (!appointment) {
      return next(new NotFoundError('Appointment'));
    }

    logger.info(`Appointment deleted`, { appointmentId: req.params.id });

    res.json({
      success: true,
      message: 'Appointment deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete appointment error: ${error.message}`);
    next(error);
  }
};

/**
 * Get appointment statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAppointmentStatistics = async (req, res, next) => {
  try {
    const total = await Appointment.countDocuments();
    const completed = await Appointment.countDocuments({ status: 'completed' });
    const scheduled = await Appointment.countDocuments({ status: 'scheduled' });
    const cancelled = await Appointment.countDocuments({ status: 'cancelled' });
    const noShow = await Appointment.countDocuments({ status: 'no-show' });

    logger.debug(`Retrieved appointment statistics`);

    res.json({
      success: true,
      data: {
        total,
        completed,
        scheduled,
        cancelled,
        noShow,
        completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    logger.error(`Get appointment statistics error: ${error.message}`);
    next(error);
  }
};