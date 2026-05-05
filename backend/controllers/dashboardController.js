const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const SystemActivity = require('../models/SystemActivity');
const { logger } = require('../middleware/logger');
const { getTimeAgo } = require('../utils/dateHelpers');

/**
 * Get dashboard statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalPatients = await Patient.countDocuments();
    const totalDoctors = await Doctor.countDocuments();
    const totalAppointments = await Appointment.countDocuments();

    // Calculate revenue
    const revenue = totalAppointments * 50;

    // Calculate monthly growth
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const thisMonthPatients = await Patient.countDocuments({
      createdAt: { $gte: thisMonthStart }
    });

    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthStart = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1);
    const lastMonthEnd = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0);

    const lastMonthPatients = await Patient.countDocuments({
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });

    const patientGrowth = lastMonthPatients ? ((thisMonthPatients - lastMonthPatients) / lastMonthPatients * 100).toFixed(1) : 0;

    // Calculate weekly appointments
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weeklyAppointmentsRaw = await Appointment.aggregate([
      {
        $match: {
          appointmentDate: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: "$appointmentDate" },
          count: { $sum: 1 }
        }
      }
    ]);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyAppointments = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      const dayNum = d.getDay() + 1; // MongoDB $dayOfWeek returns 1-7
      
      const found = weeklyAppointmentsRaw.find(item => item._id === dayNum);
      weeklyAppointments.push({
        name: dayName,
        appointments: found ? found.count : 0
      });
    }

    // Calculate patient growth over last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const patientGrowthRaw = await Patient.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
          count: { $sum: 1 }
        }
      }
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const patientGrowthData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthName = months[d.getMonth()];
      const year = d.getFullYear();
      
      const found = patientGrowthRaw.find(item => item._id.month === d.getMonth() + 1 && item._id.year === year);
      patientGrowthData.push({
        name: monthName,
        patients: found ? found.count : 0
      });
    }

    logger.info(`Dashboard stats retrieved`);

    res.json({
      success: true,
      data: {
        totalPatients: {
          value: totalPatients,
          change: `+${patientGrowth}% vs last month`
        },
        totalDoctors: {
          value: totalDoctors,
          change: '+23 vs last month'
        },
        appointments: {
          value: totalAppointments,
          change: '+25 vs last month'
        },
        revenue: {
          value: `$${(revenue / 1000).toFixed(1)}K`,
          change: '+15% vs last month'
        },
        weeklyAppointments,
        patientGrowthData
      }
    });
  } catch (error) {
    logger.error(`Get dashboard stats error: ${error.message}`);
    next(error);
  }
};

/**
 * Get recent system activity
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getRecentActivity = async (req, res, next) => {
  try {
    const activities = await SystemActivity.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'name');

    const formattedActivities = activities.map(activity => ({
      type: activity.activityType,
      text: activity.description,
      time: getTimeAgo(activity.createdAt)
    }));

    logger.debug(`Recent activity retrieved`);

    res.json({
      success: true,
      data: formattedActivities
    });
  } catch (error) {
    logger.error(`Get recent activity error: ${error.message}`);
    next(error);
  }
};

/**
 * Get system status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSystemStatus = async (req, res, next) => {
  try {
    const activeSessions = 234; // Mock data
    const pendingApprovals = 12;
    const systemUptime = 99.9;
    const satisfaction = 4.8;

    logger.debug(`System status retrieved`);

    res.json({
      success: true,
      data: {
        activeSessions,
        pendingApprovals,
        systemUptime,
        satisfaction
      }
    });
  } catch (error) {
    logger.error(`Get system status error: ${error.message}`);
    next(error);
  }
};

/**
 * Get user statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserStatistics = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });
    const doctorCount = await User.countDocuments({ role: 'doctor' });
    const patientCount = await User.countDocuments({ role: 'patient' });
    const receptionistCount = await User.countDocuments({ role: 'receptionist' });

    logger.debug(`User statistics retrieved`);

    res.json({
      success: true,
      data: {
        totalUsers,
        adminCount,
        doctorCount,
        patientCount,
        receptionistCount
      }
    });
  } catch (error) {
    logger.error(`Get user statistics error: ${error.message}`);
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
    const totalAppointments = await Appointment.countDocuments();
    const completed = await Appointment.countDocuments({ status: 'completed' });
    const scheduled = await Appointment.countDocuments({ status: 'scheduled' });
    const cancelled = await Appointment.countDocuments({ status: 'cancelled' });
    const noShow = await Appointment.countDocuments({ status: 'no-show' });

    logger.debug(`Appointment statistics retrieved`);

    res.json({
      success: true,
      data: {
        totalAppointments,
        completed,
        scheduled,
        cancelled,
        noShow,
        completionRate: totalAppointments > 0 ? ((completed / totalAppointments) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    logger.error(`Get appointment statistics error: ${error.message}`);
    next(error);
  }
};