const Report = require('../models/Report');
const Appointment = require('../models/appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/doctor');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const { logger } = require('../middlewares/logger');

/**
 * Get all reports
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllReports = async (req, res, next) => {
  try {
    const { type, status, page = 1, limit = 10 } = req.query;

    let query = {};

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const reports = await Report.find(query)
      .populate('generatedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Report.countDocuments(query);

    logger.debug(`Retrieved ${reports.length} reports`);

    res.json({
      success: true,
      count: reports.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: reports
    });
  } catch (error) {
    logger.error(`Get all reports error: ${error.message}`);
    next(error);
  }
};

/**
 * Get dashboard statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalRevenue = 304000;
    const appointmentCount = await Appointment.countDocuments();
    const newPatients = await Patient.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setDate(1)),
        $lt: new Date()
      }
    });
    const prescriptions = 1542;

    logger.debug(`Dashboard statistics retrieved`);

    res.json({
      success: true,
      data: {
        totalRevenue: {
          value: '$304K',
          change: '+15% from last month'
        },
        appointments: {
          value: appointmentCount || 2638,
          change: '+8% from last month'
        },
        newPatients: {
          value: newPatients || 234,
          change: '+2% from last month'
        },
        prescriptions: {
          value: prescriptions,
          change: '+5% from last month'
        }
      }
    });
  } catch (error) {
    logger.error(`Get dashboard stats error: ${error.message}`);
    next(error);
  }
};

/**
 * Get appointment trends
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAppointmentTrends = async (req, res, next) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const appointments = await Appointment.aggregate([
      {
        $addFields: {
          parsedDate: { $toDate: { $ifNull: ["$appointmentDate", "$date"] } }
        }
      },
      {
        $match: {
          parsedDate: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: { $month: "$parsedDate" },
          count: { $sum: 1 }
        }
      }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const trends = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthIndex = d.getMonth();
      const monthName = monthNames[monthIndex];
      
      const record = appointments.find(a => a._id === (monthIndex + 1));
      trends.push({
        month: monthName,
        value: record ? record.count : 0
      });
    }

    logger.debug(`Appointment trends retrieved`);

    res.json({ success: true, data: trends });
  } catch (error) {
    logger.error(`Get appointment trends error: ${error.message}`);
    next(error);
  }
};

/**
 * Get appointment status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAppointmentStatus = async (req, res, next) => {
  try {
    const completed = await Appointment.countDocuments({ status: 'completed' });
    const upcoming = await Appointment.countDocuments({ status: 'scheduled' });
    const cancelled = await Appointment.countDocuments({ status: 'cancelled' });

    logger.debug(`Appointment status retrieved`);

    res.json({
      success: true,
      data: {
        completed: completed,
        upcoming: upcoming,
        cancelled: cancelled
      }
    });
  } catch (error) {
    logger.error(`Get appointment status error: ${error.message}`);
    next(error);
  }
};

/**
 * Get appointment types
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAppointmentTypes = async (req, res, next) => {
  try {
    const virtualConsultation = await Appointment.countDocuments({ consultationType: 'video' });
    const inPersonVisit = await Appointment.countDocuments({ consultationType: 'in-person' });

    logger.debug(`Appointment types retrieved`);

    res.json({
      success: true,
      data: {
        virtualConsultation: virtualConsultation,
        inPersonVisit: inPersonVisit
      }
    });
  } catch (error) {
    logger.error(`Get appointment types error: ${error.message}`);
    next(error);
  }
};

/**
 * Get revenue trends
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getRevenueTrends = async (req, res, next) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const appointments = await Appointment.aggregate([
      {
        $addFields: {
          parsedDate: { $toDate: { $ifNull: ["$appointmentDate", "$date"] } }
        }
      },
      {
        $match: {
          parsedDate: { $gte: twelveMonthsAgo },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: { $month: "$parsedDate" },
          revenue: { $sum: 50 } // Assuming $50 per appointment as in generateRevenueReport
        }
      }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const revenues = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthIndex = d.getMonth();
      const monthName = monthNames[monthIndex];
      
      const record = appointments.find(a => a._id === (monthIndex + 1));
      revenues.push({
        month: monthName,
        value: record ? record.revenue : 0
      });
    }

    logger.debug(`Revenue trends retrieved`);

    res.json({ success: true, data: revenues });
  } catch (error) {
    logger.error(`Get revenue trends error: ${error.message}`);
    next(error);
  }
};

/**
 * Get revenue breakdown
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getRevenueBreakdown = async (req, res, next) => {
  try {
    const completedAppointments = await Appointment.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$consultationType',
          count: { $sum: 1 }
        }
      }
    ]);

    const typeMap = {};
    completedAppointments.forEach(item => {
      typeMap[item._id] = item.count * 50;
    });

    const totalRevenue = Object.values(typeMap).reduce((sum, val) => sum + val, 0);

    const breakdown = {
      consultations: { value: typeMap['in-person'] || 0, percentage: totalRevenue > 0 ? parseFloat((((typeMap['in-person'] || 0) / totalRevenue) * 100).toFixed(1)) : 0 },
      videoConsultations: { value: typeMap['video'] || 0, percentage: totalRevenue > 0 ? parseFloat((((typeMap['video'] || 0) / totalRevenue) * 100).toFixed(1)) : 0 },
      phoneConsultations: { value: typeMap['phone'] || 0, percentage: totalRevenue > 0 ? parseFloat((((typeMap['phone'] || 0) / totalRevenue) * 100).toFixed(1)) : 0 }
    };

    logger.debug(`Revenue breakdown retrieved`);

    res.json({ success: true, data: breakdown });
  } catch (error) {
    logger.error(`Get revenue breakdown error: ${error.message}`);
    next(error);
  }
};

/**
 * Get payment methods
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getPaymentMethods = async (req, res, next) => {
  try {
    // Aggregate completed appointments and join with doctor to get specialization
    const results = await Appointment.aggregate([
      { $match: { status: 'completed' } },
      {
        $lookup: {
          from: 'doctors',
          localField: 'doctorId',
          foreignField: '_id',
          as: 'doctor'
        }
      },
      { $unwind: { path: '$doctor', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$doctor.specialization',
          count: { $sum: 1 }
        }
      }
    ]);

    const specMap = {};
    results.forEach(item => {
      const name = item._id || 'Other';
      specMap[name] = item.count * 50;
    });

    const totalRevenue = Object.values(specMap).reduce((sum, val) => sum + val, 0);

    const methods = {};
    Object.keys(specMap).forEach(key => {
      methods[key.toLowerCase()] = {
        value: specMap[key],
        percentage: totalRevenue > 0 ? parseFloat(((specMap[key] / totalRevenue) * 100).toFixed(1)) : 0
      };
    });

    logger.debug(`Payment methods retrieved`);

    res.json({ success: true, data: methods });
  } catch (error) {
    logger.error(`Get payment methods error: ${error.message}`);
    next(error);
  }
};

/**
 * Get specialty performance
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSpecialtyPerformance = async (req, res, next) => {
  try {
    const distinctSpecialties = await Doctor.distinct('specialization');
    const validSpecialties = distinctSpecialties.filter(s => s && s.trim() !== '');
    const predefinedSpecialties = ['General', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Psychiatry', 'Dermatology', 'Oncology', 'Urology', 'Counselor'];
    
    const allSpecialties = [...new Set([...predefinedSpecialties, ...validSpecialties])];

    const results = await Appointment.aggregate([
      { $match: { status: 'completed' } },
      {
        $lookup: {
          from: 'doctors',
          localField: 'doctorId',
          foreignField: '_id',
          as: 'doctor'
        }
      },
      { $unwind: { path: '$doctor', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$doctor.specialization',
          count: { $sum: 1 }
        }
      }
    ]);

    const countMap = {};
    results.forEach(r => {
      if (r._id) {
        countMap[r._id] = r.count;
      }
    });

    const maxValue = Math.max(...results.map(r => r.count), 10);
    
    let performance = allSpecialties.map(specialty => ({
      specialty,
      value: countMap[specialty] || 0,
      maxValue: Math.ceil(maxValue * 1.2)
    }));

    logger.debug(`Specialty performance retrieved`);

    res.json({ success: true, data: performance });
  } catch (error) {
    logger.error(`Get specialty performance error: ${error.message}`);
    next(error);
  }
};

/**
 * Get top performing doctors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTopDoctors = async (req, res, next) => {
  try {
    const doctorsData = await Doctor.aggregate([
      {
        $lookup: {
          from: 'appointments',
          localField: '_id',
          foreignField: 'doctorId',
          as: 'appointments'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $addFields: {
          calculatedPatients: {
            $size: {
              $ifNull: [
                {
                  $setUnion: {
                    $map: {
                      input: '$appointments',
                      as: 'apt',
                      in: '$$apt.patientId'
                    }
                  }
                },
                []
              ]
            }
          },
          calculatedRating: {
            $avg: {
              $filter: {
                input: {
                  $map: {
                    input: '$appointments',
                    as: 'apt',
                    in: '$$apt.rating'
                  }
                },
                as: 'rating',
                cond: { $ne: ['$$rating', null] }
              }
            }
          }
        }
      },
      {
        $addFields: {
          finalPatients: { $add: [{ $ifNull: ['$totalPatients', 0] }, '$calculatedPatients'] },
          finalRating: { 
            $cond: [
              { $and: [{ $ne: ['$calculatedRating', null] }, { $gt: ['$calculatedRating', 0] }] }, 
              { $round: [{ $divide: [{ $add: [{ $ifNull: ['$rating', 0] }, '$calculatedRating'] }, 2] }, 1] }, 
              { $ifNull: ['$rating', 0] }
            ] 
          }
        }
      },
      {
        $sort: { finalRating: -1, finalPatients: -1 }
      },
      {
        $limit: 5
      }
    ]);

    const topDoctors = doctorsData.map(doc => ({
      id: doc._id,
      name: doc.name || (doc.user && doc.user.length > 0 ? doc.user[0].name : 'Unknown Doctor'),
      patients: doc.finalPatients || 0,
      rating: doc.finalRating || 0
    }));

    logger.debug(`Top doctors retrieved dynamically`);

    res.json({ success: true, data: topDoctors });
  } catch (error) {
    logger.error(`Get top doctors error: ${error.message}`);
    next(error);
  }
};

/**
 * Get patient satisfaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getPatientSatisfaction = async (req, res, next) => {
  try {
    // 1. Get real ratings from Appointments
    const ratingAggregation = await Appointment.aggregate([
      { $match: { rating: { $ne: null, $gte: 1, $lte: 5 } } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      }
    ]);

    let dynamicCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let dynamicTotalReviews = 0;
    let dynamicSumRating = 0;

    ratingAggregation.forEach(item => {
      const star = Math.round(item._id);
      if (star >= 1 && star <= 5) {
        dynamicCounts[star] += item.count;
        dynamicTotalReviews += item.count;
        dynamicSumRating += star * item.count;
      }
    });

    // 2. Get static data from Doctors
    const doctors = await Doctor.find({ totalReviews: { $gt: 0 } });
    
    let staticTotalReviews = 0;
    let staticSumRating = 0;
    
    doctors.forEach(doc => {
      staticTotalReviews += doc.totalReviews;
      staticSumRating += doc.rating * doc.totalReviews;
    });

    // 3. Combine them
    const totalReviews = staticTotalReviews + dynamicTotalReviews;
    const sumRating = staticSumRating + dynamicSumRating;
    const avgRating = totalReviews > 0 ? (sumRating / totalReviews) : 0;
    
    // Simulate static distribution based on static average
    const staticAvg = staticTotalReviews > 0 ? (staticSumRating / staticTotalReviews) : 0;
    const staticDist5 = Math.round(staticTotalReviews * (staticAvg / 5));
    const staticDist4 = Math.round(staticTotalReviews * ((5 - staticAvg) / 5) * 0.8);
    const staticDist3 = Math.round(staticTotalReviews * ((5 - staticAvg) / 5) * 0.15);
    const staticDist2 = Math.round(staticTotalReviews * ((5 - staticAvg) / 5) * 0.05);
    const staticDist1 = Math.max(0, staticTotalReviews - (staticDist5 + staticDist4 + staticDist3 + staticDist2));

    // Final blended distribution
    const dist5 = staticDist5 + dynamicCounts[5];
    const dist4 = staticDist4 + dynamicCounts[4];
    const dist3 = staticDist3 + dynamicCounts[3];
    const dist2 = staticDist2 + dynamicCounts[2];
    const dist1 = staticDist1 + dynamicCounts[1];

    const ratingDistribution = {
      5: { count: dist5, percentage: totalReviews > 0 ? parseFloat(((dist5 / totalReviews) * 100).toFixed(1)) : 0 },
      4: { count: dist4, percentage: totalReviews > 0 ? parseFloat(((dist4 / totalReviews) * 100).toFixed(1)) : 0 },
      3: { count: dist3, percentage: totalReviews > 0 ? parseFloat(((dist3 / totalReviews) * 100).toFixed(1)) : 0 },
      2: { count: dist2, percentage: totalReviews > 0 ? parseFloat(((dist2 / totalReviews) * 100).toFixed(1)) : 0 },
      1: { count: dist1, percentage: totalReviews > 0 ? parseFloat(((dist1 / totalReviews) * 100).toFixed(1)) : 0 }
    };

    logger.debug(`Patient satisfaction retrieved dynamically`);

    res.json({
      success: true,
      data: {
        avgRating,
        totalReviews,
        ratingDistribution
      }
    });
  } catch (error) {
    logger.error(`Get patient satisfaction error: ${error.message}`);
    next(error);
  }
};

/**
 * Generate appointment report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.generateAppointmentReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return next(new ValidationError('Start date and end date are required'));
    }

    const appointments = await Appointment.find({
      appointmentDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).populate('doctorId', 'specialization').populate('patientId', 'name');

    const report = new Report({
      title: `Appointment Report ${startDate} to ${endDate}`,
      type: 'appointment',
      filters: { startDate, endDate },
      data: {
        appointments,
        totalCount: appointments.length,
        byStatus: {
          completed: appointments.filter(a => a.status === 'completed').length,
          scheduled: appointments.filter(a => a.status === 'scheduled').length,
          cancelled: appointments.filter(a => a.status === 'cancelled').length
        }
      },
      generatedBy: req.userId
    });

    await report.save();

    logger.info(`Appointment report generated`, { reportId: report._id });

    res.status(201).json({
      success: true,
      message: 'Report generated successfully',
      data: report
    });
  } catch (error) {
    logger.error(`Generate appointment report error: ${error.message}`);
    next(error);
  }
};

/**
 * Generate patient report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.generatePatientReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return next(new ValidationError('Start date and end date are required'));
    }

    const patients = await Patient.find({
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).populate('userId', 'name email phone');

    const report = new Report({
      title: `Patient Report ${startDate} to ${endDate}`,
      type: 'patient',
      filters: { startDate, endDate },
      data: {
        totalPatients: patients.length,
        byGender: {
          male: patients.filter(p => p.gender === 'male').length,
          female: patients.filter(p => p.gender === 'female').length,
          other: patients.filter(p => p.gender === 'other').length
        },
        patients
      },
      generatedBy: req.userId
    });

    await report.save();

    logger.info(`Patient report generated`, { reportId: report._id });

    res.status(201).json({
      success: true,
      message: 'Report generated successfully',
      data: report
    });
  } catch (error) {
    logger.error(`Generate patient report error: ${error.message}`);
    next(error);
  }
};

/**
 * Generate revenue report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.generateRevenueReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return next(new ValidationError('Start date and end date are required'));
    }

    const appointments = await Appointment.find({
      appointmentDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      status: 'completed'
    });

    const totalRevenue = appointments.length * 50;

    const report = new Report({
      title: `Revenue Report ${startDate} to ${endDate}`,
      type: 'revenue',
      filters: { startDate, endDate },
      data: {
        totalRevenue,
        completedAppointments: appointments.length,
        averagePerAppointment: appointments.length > 0 ? (totalRevenue / appointments.length).toFixed(2) : 0
      },
      generatedBy: req.userId
    });

    await report.save();

    logger.info(`Revenue report generated`, { reportId: report._id });

    res.status(201).json({
      success: true,
      message: 'Report generated successfully',
      data: report
    });
  } catch (error) {
    logger.error(`Generate revenue report error: ${error.message}`);
    next(error);
  }
};

/**
 * Export report to CSV
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.exportReportToCSV = async (req, res, next) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findById(reportId);

    if (!report) {
      return next(new NotFoundError('Report'));
    }

    let csv = `Report: ${report.title}\n`;
    csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;

    if (report.type === 'appointment') {
      csv += 'Appointment Report\n';
      csv += 'Date,Status,Type,Doctor,Patient\n';
      report.data.appointments.forEach(apt => {
        csv += `${apt.appointmentDate},${apt.status},${apt.consultationType},${apt.doctorId.specialization},${apt.patientId.name}\n`;
      });
    }

    logger.info(`Report exported to CSV`, { reportId });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error(`Export report to CSV error: ${error.message}`);
    next(error);
  }
};

/**
 * Get report by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getReportById = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('generatedBy', 'name email');

    if (!report) {
      return next(new NotFoundError('Report'));
    }

    logger.debug(`Report retrieved: ${req.params.id}`);

    res.json({ success: true, data: report });
  } catch (error) {
    logger.error(`Get report by ID error: ${error.message}`);
    next(error);
  }
};

/**
 * Delete report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteReport = async (req, res, next) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);

    if (!report) {
      return next(new NotFoundError('Report'));
    }

    logger.info(`Report deleted`, { reportId: req.params.id });

    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    logger.error(`Delete report error: ${error.message}`);
    next(error);
  }
};