const mongoose = require('mongoose');
const User = require('../models/user');
const Doctor = require('../models/doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/appointment');
const SystemActivity = require('../models/SystemActivity');
const { logger } = require('../middlewares/logger');
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

    // Calculate revenue based on completed appointments only
    const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
    const revenue = completedAppointments * 50;

    // Calculate cumulative growth compared to last month
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const lastMonthTotalPatients = await Patient.countDocuments({
      createdAt: { $lt: thisMonthStart }
    });
    const patientGrowth = lastMonthTotalPatients > 0 
      ? ((totalPatients - lastMonthTotalPatients) / lastMonthTotalPatients * 100).toFixed(1) 
      : (totalPatients > 0 ? '100.0' : '0.0');
    const patientChangeStr = parseFloat(patientGrowth) >= 0 ? `+${patientGrowth}% vs last month` : `${patientGrowth}% vs last month`;

    const lastMonthTotalDoctors = await Doctor.countDocuments({
      createdAt: { $lt: thisMonthStart }
    });
    const doctorGrowth = lastMonthTotalDoctors > 0 
      ? ((totalDoctors - lastMonthTotalDoctors) / lastMonthTotalDoctors * 100).toFixed(1) 
      : (totalDoctors > 0 ? '100.0' : '0.0');
    const doctorChangeStr = parseFloat(doctorGrowth) >= 0 ? `+${doctorGrowth}% vs last month` : `${doctorGrowth}% vs last month`;

    const lastMonthTotalAppointments = await Appointment.countDocuments({
      date: { $lt: thisMonthStart }
    });
    const apptGrowth = lastMonthTotalAppointments > 0 
      ? ((totalAppointments - lastMonthTotalAppointments) / lastMonthTotalAppointments * 100).toFixed(1) 
      : (totalAppointments > 0 ? '100.0' : '0.0');
    const apptChangeStr = parseFloat(apptGrowth) >= 0 ? `+${apptGrowth}% vs last month` : `${apptGrowth}% vs last month`;

    const lastMonthCompletedAppts = await Appointment.countDocuments({
      date: { $lt: thisMonthStart },
      status: 'completed'
    });
    const lastMonthRevenueTotal = lastMonthCompletedAppts * 50;
    const revenueGrowth = lastMonthRevenueTotal > 0 
      ? ((revenue - lastMonthRevenueTotal) / lastMonthRevenueTotal * 100).toFixed(1) 
      : (revenue > 0 ? '100.0' : '0.0');
    const revenueChangeStr = parseFloat(revenueGrowth) >= 0 ? `+${revenueGrowth}% vs last month` : `${revenueGrowth}% vs last month`;

    // Calculate weekly appointments
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weeklyAppointmentsRaw = await Appointment.aggregate([
      {
        $match: {
          date: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: "$date" },
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
          change: patientChangeStr
        },
        totalDoctors: {
          value: totalDoctors,
          change: doctorChangeStr
        },
        appointments: {
          value: totalAppointments,
          change: apptChangeStr
        },
        revenue: {
          value: `$${revenue}`,
          change: revenueChangeStr
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
    const { limit = 15 } = req.query;

    const activities = await SystemActivity.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('userId', 'name email role');

    const formattedActivities = activities.map(activity => ({
      id: activity._id,
      type: activity.activityType,
      text: activity.description,
      time: getTimeAgo(activity.createdAt),
      timestamp: activity.createdAt,
      status: activity.status || 'success',
      resourceType: activity.resourceType || 'System',
      user: activity.userId ? {
        name: activity.userId.name,
        email: activity.userId.email,
        role: activity.userId.role
      } : null
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