const mongoose = require('mongoose');
const User = require('../models/user');
const Doctor = require('../models/doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/appointment');
const Payment = require('../models/payment');
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

    // Doctor verification counts
    const verifiedDoctors = await Doctor.countDocuments({ isVerified: true });
    const pendingDoctors = await Doctor.countDocuments({ isVerified: false });
    const activeDoctors = await Doctor.countDocuments({ status: { $in: ['active', 'Active'] } });

    // Patient active counts
    const activePatients = await Patient.countDocuments({ status: { $in: ['active', 'Active'] } }) || totalPatients;

    // Appointment modality breakdown
    const virtualAppointments = await Appointment.countDocuments({ type: 'Virtual' });
    const physicalAppointments = await Appointment.countDocuments({ type: 'Physical' });

    // Calculate revenue based on successful payments from database
    const successPayments = await Payment.find({
      status: { $in: ['Success', 'Paid', 'completed', 'success', 'paid'] }
    });

    const revenue = successPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const paidCount = successPayments.length;
    const avgRevenue = paidCount > 0 ? Math.round(revenue / paidCount) : 0;

    // Time boundaries
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // New additions this month
    const newPatientsThisMonth = await Patient.countDocuments({
      createdAt: { $gte: thisMonthStart }
    });
    const newPatientsLastMonth = await Patient.countDocuments({
      createdAt: { $gte: lastMonthStart, $lt: thisMonthStart }
    });
    const patientGrowth = newPatientsLastMonth > 0
      ? (((newPatientsThisMonth - newPatientsLastMonth) / newPatientsLastMonth) * 100).toFixed(1)
      : (newPatientsThisMonth > 0 ? '+100' : '0');
    const patientChangeStr = newPatientsThisMonth > 0
      ? `+${newPatientsThisMonth} new this month`
      : `${totalPatients} active profiles`;

    const newDoctorsThisMonth = await Doctor.countDocuments({
      createdAt: { $gte: thisMonthStart }
    });
    const doctorChangeStr = pendingDoctors > 0
      ? `${verifiedDoctors} Verified · ${pendingDoctors} Pending SLMC`
      : `${verifiedDoctors} Verified Active`;

    const thisWeekAppointments = await Appointment.countDocuments({
      $or: [
        { createdAt: { $gte: sevenDaysAgo } },
        { date: { $gte: sevenDaysAgo } },
        { appointmentDate: { $gte: sevenDaysAgo } }
      ]
    });
    const apptChangeStr = `${virtualAppointments} Virtual · ${physicalAppointments} Physical`;

    const thisMonthPayments = successPayments.filter(p => p.createdAt && new Date(p.createdAt) >= thisMonthStart);
    const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const revenueChangeStr = paidCount > 0
      ? `${paidCount} Paid · Avg ~LKR ${avgRevenue.toLocaleString()}`
      : `LKR 0 this month`;

    // Calculate weekly appointments
    const weeklyAppointmentsRaw = await Appointment.aggregate([
      {
        $match: {
          $or: [
            { createdAt: { $gte: sevenDaysAgo } },
            { date: { $gte: sevenDaysAgo } },
            { appointmentDate: { $gte: sevenDaysAgo } }
          ]
        }
      },
      {
        $group: {
          _id: {
            $dayOfWeek: {
              $ifNull: [
                "$createdAt",
                { $ifNull: ["$date", "$appointmentDate"] }
              ]
            }
          },
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
          change: patientChangeStr,
          newThisMonth: newPatientsThisMonth,
          active: activePatients,
          growthRate: patientGrowth
        },
        totalDoctors: {
          value: totalDoctors,
          change: doctorChangeStr,
          verified: verifiedDoctors,
          pending: pendingDoctors,
          active: activeDoctors
        },
        appointments: {
          value: totalAppointments,
          change: apptChangeStr,
          virtual: virtualAppointments,
          physical: physicalAppointments,
          thisWeek: thisWeekAppointments
        },
        revenue: {
          value: `LKR ${revenue.toLocaleString()}`,
          change: revenueChangeStr,
          paidCount,
          avgRevenue,
          thisMonthRevenue
        },
        summary: {
          doctorVerificationRate: totalDoctors > 0 ? ((verifiedDoctors / totalDoctors) * 100).toFixed(1) : '100',
          virtualRatio: totalAppointments > 0 ? ((virtualAppointments / totalAppointments) * 100).toFixed(1) : '0',
          systemUptime: '99.9%'
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