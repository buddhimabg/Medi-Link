const SystemActivity = require('../models/SystemActivity');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const { ValidationError } = require('../utils/errorHandler');
const { logger } = require('../middleware/logger');

/**
 * Get system activity
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSystemActivity = async (req, res, next) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const activities = await SystemActivity.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await SystemActivity.countDocuments();

    logger.debug(`Retrieved system activity`);

    res.json({
      success: true,
      count: activities.length,
      total,
      data: activities
    });
  } catch (error) {
    logger.error(`Get system activity error: ${error.message}`);
    next(error);
  }
};

/**
 * Get system statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSystemStatistics = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });
    const doctorCount = await User.countDocuments({ role: 'doctor' });
    const patientCount = await User.countDocuments({ role: 'patient' });
    const receptionistCount = await User.countDocuments({ role: 'receptionist' });

    const totalAppointments = await Appointment.countDocuments();
    const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
    const scheduledAppointments = await Appointment.countDocuments({ status: 'scheduled' });

    const totalActivities = await SystemActivity.countDocuments();

    logger.debug(`System statistics retrieved`);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          admin: adminCount,
          doctor: doctorCount,
          patient: patientCount,
          receptionist: receptionistCount
        },
        appointments: {
          total: totalAppointments,
          completed: completedAppointments,
          scheduled: scheduledAppointments
        },
        activities: totalActivities
      }
    });
  } catch (error) {
    logger.error(`Get system statistics error: ${error.message}`);
    next(error);
  }
};

/**
 * Log system activity
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.logActivity = async (req, res, next) => {
  try {
    const { activityType, description, metadata } = req.body;

    if (!activityType || !description) {
      return next(new ValidationError('Activity type and description are required'));
    }

    const activity = new SystemActivity({
      userId: req.userId,
      activityType,
      description,
      metadata
    });

    await activity.save();

    logger.info(`Activity logged`, { activityType });

    res.status(201).json({
      success: true,
      message: 'Activity logged successfully',
      data: activity
    });
  } catch (error) {
    logger.error(`Log activity error: ${error.message}`);
    next(error);
  }
};

/**
 * Get activity by type
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getActivityByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { limit = 50 } = req.query;

    const activities = await SystemActivity.find({ activityType: type })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    logger.debug(`Retrieved activities by type: ${type}`);

    res.json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    logger.error(`Get activity by type error: ${error.message}`);
    next(error);
  }
};

/**
 * Clear old activities
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.clearOldActivities = async (req, res, next) => {
  try {
    const { days = 30 } = req.body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await SystemActivity.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    logger.info(`Old activities cleared`, { deletedCount: result.deletedCount, days });

    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} old activities`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    logger.error(`Clear old activities error: ${error.message}`);
    next(error);
  }
};

/**
 * Get system health
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSystemHealth = async (req, res, next) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'connected',
      services: {
        users: await User.countDocuments(),
        doctors: await Doctor.countDocuments(),
        patients: await Patient.countDocuments(),
        appointments: await Appointment.countDocuments()
      }
    };

    logger.debug(`System health checked`);

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error(`Get system health error: ${error.message}`);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      message: error.message || 'System health check failed'
    });
  }
};