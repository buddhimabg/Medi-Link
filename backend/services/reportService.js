const Report = require('../models/Report');
const Appointment = require('../models/appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/doctor');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const { logger } = require('../middlewares/logger');

/**
 * Report Service
 * Handles all report generation and management
 */

/**
 * Get all reports with filters
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Records per page
 * @returns {Promise<Object>} Reports list and metadata
 */
exports.getAllReports = async (filters = {}, page = 1, limit = 10) => {
  try {
    let query = {};

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const skip = (page - 1) * limit;

    const reports = await Report.find(query)
      .populate('generatedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Report.countDocuments(query);

    logger.debug(`Retrieved ${reports.length} reports`);

    return {
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error(`Get all reports error: ${error.message}`);
    throw error;
  }
};

/**
 * Get report by ID
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Report details
 */
exports.getReportById = async (reportId) => {
  try {
    const report = await Report.findById(reportId)
      .populate('generatedBy', 'name email');

    if (!report) {
      throw new NotFoundError('Report');
    }

    logger.debug(`Retrieved report: ${reportId}`);

    return report;
  } catch (error) {
    logger.error(`Get report by ID error: ${error.message}`);
    throw error;
  }
};

/**
 * Generate appointment report
 * @param {Date} startDate - Report start date
 * @param {Date} endDate - Report end date
 * @param {string} userId - User generating report
 * @returns {Promise<Object>} Generated report
 */
exports.generateAppointmentReport = async (startDate, endDate, userId) => {
  try {
    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required');
    }

    const appointments = await Appointment.find({
      appointmentDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).populate('doctorId', 'specialization').populate('patientId', 'name');

    const report = new Report({
      title: `Appointment Report ${startDate} to ${endDate}`,
      description: `Report of all appointments from ${startDate} to ${endDate}`,
      type: 'appointment',
      filters: { startDate, endDate },
      data: {
        appointments,
        totalCount: appointments.length,
        byStatus: {
          completed: appointments.filter(a => a.status === 'completed').length,
          scheduled: appointments.filter(a => a.status === 'scheduled').length,
          cancelled: appointments.filter(a => a.status === 'cancelled').length,
          noShow: appointments.filter(a => a.status === 'no-show').length
        }
      },
      generatedBy: userId,
      status: 'completed'
    });

    await report.save();

    logger.info(`Appointment report generated`, { reportId: report._id });

    return report;
  } catch (error) {
    logger.error(`Generate appointment report error: ${error.message}`);
    throw error;
  }
};

/**
 * Generate patient report
 * @param {Date} startDate - Report start date
 * @param {Date} endDate - Report end date
 * @param {string} userId - User generating report
 * @returns {Promise<Object>} Generated report
 */
exports.generatePatientReport = async (startDate, endDate, userId) => {
  try {
    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required');
    }

    const patients = await Patient.find({
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).populate('userId', 'name email phone');

    const report = new Report({
      title: `Patient Report ${startDate} to ${endDate}`,
      description: `Report of all patients registered from ${startDate} to ${endDate}`,
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
      generatedBy: userId,
      status: 'completed'
    });

    await report.save();

    logger.info(`Patient report generated`, { reportId: report._id });

    return report;
  } catch (error) {
    logger.error(`Generate patient report error: ${error.message}`);
    throw error;
  }
};

/**
 * Generate revenue report
 * @param {Date} startDate - Report start date
 * @param {Date} endDate - Report end date
 * @param {string} userId - User generating report
 * @returns {Promise<Object>} Generated report
 */
exports.generateRevenueReport = async (startDate, endDate, userId) => {
  try {
    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required');
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
      description: `Revenue report from ${startDate} to ${endDate}`,
      type: 'revenue',
      filters: { startDate, endDate },
      data: {
        totalRevenue,
        completedAppointments: appointments.length,
        averagePerAppointment: appointments.length > 0 ? (totalRevenue / appointments.length).toFixed(2) : 0
      },
      generatedBy: userId,
      status: 'completed'
    });

    await report.save();

    logger.info(`Revenue report generated`, { reportId: report._id });

    return report;
  } catch (error) {
    logger.error(`Generate revenue report error: ${error.message}`);
    throw error;
  }
};

/**
 * Export report to CSV
 * @param {string} reportId - Report ID
 * @returns {Promise<string>} CSV string
 */
exports.exportReportToCSV = async (reportId) => {
  try {
    const report = await Report.findById(reportId);

    if (!report) {
      throw new NotFoundError('Report');
    }

    let csv = `Report: ${report.title}\n`;
    csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;

    if (report.type === 'appointment') {
      csv += 'Appointment Report\n';
      csv += 'Date,Status,Type,Doctor,Patient\n';
      report.data.appointments.forEach(apt => {
        csv += `${apt.appointmentDate},${apt.status},${apt.consultationType},${apt.doctorId.specialization},${apt.patientId.name}\n`;
      });
    } else if (report.type === 'patient') {
      csv += 'Patient Report\n';
      csv += 'Name,Email,Gender,Age\n';
      report.data.patients.forEach(patient => {
        csv += `${patient.userId.name},${patient.userId.email},${patient.gender}\n`;
      });
    }

    logger.info(`Report exported to CSV`, { reportId });

    return csv;
  } catch (error) {
    logger.error(`Export report to CSV error: ${error.message}`);
    throw error;
  }
};

/**
 * Delete report
 * @param {string} reportId - Report ID
 * @returns {Promise<void>}
 */
exports.deleteReport = async (reportId) => {
  try {
    const report = await Report.findByIdAndDelete(reportId);

    if (!report) {
      throw new NotFoundError('Report');
    }

    logger.info(`Report deleted`, { reportId });
  } catch (error) {
    logger.error(`Delete report error: ${error.message}`);
    throw error;
  }
};