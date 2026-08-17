const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const { logger } = require('../middleware/logger');

/**
 * Doctor Service
 * Handles all doctor-related business logic
 */

/**
 * Get all doctors with filters
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Records per page
 * @returns {Promise<Object>} Doctors list and metadata
 */
exports.getAllDoctors = async (filters = {}, page = 1, limit = 10) => {
  try {
    let query = {};

    if (filters.specialization) {
      query.specialization = filters.specialization;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const skip = (page - 1) * limit;

    const doctors = await Doctor.find(query)
      .populate('userId', 'name email phone profileImage address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Doctor.countDocuments(query);

    logger.debug(`Retrieved ${doctors.length} doctors`);

    return {
      doctors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error(`Get all doctors error: ${error.message}`);
    throw error;
  }
};

/**
 * Get doctor by ID
 * @param {string} doctorId - Doctor ID
 * @returns {Promise<Object>} Doctor details
 */
exports.getDoctorById = async (doctorId) => {
  try {
    const doctor = await Doctor.findById(doctorId)
      .populate('userId', 'name email phone address profileImage');

    if (!doctor) {
      throw new NotFoundError('Doctor');
    }

    logger.debug(`Retrieved doctor: ${doctorId}`);

    return doctor;
  } catch (error) {
    logger.error(`Get doctor by ID error: ${error.message}`);
    throw error;
  }
};

/**
 * Create or update doctor profile
 * @param {string} userId - User ID
 * @param {Object} doctorData - Doctor data
 * @returns {Promise<Object>} Doctor profile
 */
exports.createOrUpdateDoctorProfile = async (userId, doctorData) => {
  try {
    const { licenseNumber, specialization, experience, qualifications, consultationFee, availability, status } = doctorData;

    if (!licenseNumber || !specialization) {
      throw new ValidationError('License number and specialization are required');
    }

    let doctor = await Doctor.findOne({ userId });

    if (!doctor) {
      doctor = new Doctor({
        userId,
        licenseNumber,
        specialization,
        experience: experience || 0,
        qualifications: qualifications || [],
        consultationFee: consultationFee || 0,
        availability: availability || {},
        status: status || 'active'
      });
    } else {
      doctor.licenseNumber = licenseNumber || doctor.licenseNumber;
      doctor.specialization = specialization || doctor.specialization;
      doctor.experience = experience !== undefined ? experience : doctor.experience;
      doctor.qualifications = qualifications || doctor.qualifications;
      doctor.consultationFee = consultationFee !== undefined ? consultationFee : doctor.consultationFee;
      doctor.availability = availability || doctor.availability;
      doctor.status = status || doctor.status;
    }

    await doctor.save();

    const populatedDoctor = await doctor.populate('userId', 'name email phone');

    logger.info(`Doctor profile created/updated`, { userId });

    return populatedDoctor;
  } catch (error) {
    logger.error(`Create/update doctor profile error: ${error.message}`);
    throw error;
  }
};

/**
 * Update doctor status
 * @param {string} doctorId - Doctor ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated doctor
 */
exports.updateDoctorStatus = async (doctorId, status) => {
  try {
    const validStatuses = ['active', 'on-leave', 'inactive'];

    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const doctor = await Doctor.findByIdAndUpdate(
      doctorId,
      { status },
      { new: true }
    ).populate('userId', 'name email');

    if (!doctor) {
      throw new NotFoundError('Doctor');
    }

    logger.info(`Doctor status updated`, { doctorId, status });

    return doctor;
  } catch (error) {
    logger.error(`Update doctor status error: ${error.message}`);
    throw error;
  }
};

/**
 * Delete doctor
 * @param {string} doctorId - Doctor ID
 * @returns {Promise<void>}
 */
exports.deleteDoctor = async (doctorId) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(doctorId);

    if (!doctor) {
      throw new NotFoundError('Doctor');
    }

    // Delete associated user
    await User.findByIdAndDelete(doctor.userId);

    logger.info(`Doctor deleted`, { doctorId });
  } catch (error) {
    logger.error(`Delete doctor error: ${error.message}`);
    throw error;
  }
};

/**
 * Get doctor statistics
 * @returns {Promise<Object>} Doctor statistics
 */
exports.getDoctorStatistics = async () => {
  try {
    const totalDoctors = await Doctor.countDocuments();
    const activeDoctors = await Doctor.countDocuments({ status: 'active' });
    const onLeaveDoctors = await Doctor.countDocuments({ status: 'on-leave' });
    const inactiveDoctors = await Doctor.countDocuments({ status: 'inactive' });

    const avgRating = await Doctor.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    logger.debug(`Retrieved doctor statistics`);

    return {
      totalDoctors,
      activeDoctors,
      onLeaveDoctors,
      inactiveDoctors,
      averageRating: avgRating[0]?.avgRating || 0
    };
  } catch (error) {
    logger.error(`Get doctor statistics error: ${error.message}`);
    throw error;
  }
};

/**
 * Get doctor appointments
 * @param {string} doctorId - Doctor ID
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} Appointments list
 */
exports.getDoctorAppointments = async (doctorId, filters = {}) => {
  try {
    let query = { doctorId };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.startDate && filters.endDate) {
      query.appointmentDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'name email')
      .sort({ appointmentDate: -1 });

    logger.debug(`Retrieved ${appointments.length} appointments for doctor`);

    return appointments;
  } catch (error) {
    logger.error(`Get doctor appointments error: ${error.message}`);
    throw error;
  }
};

/**
 * Update doctor rating
 * @param {string} doctorId - Doctor ID
 * @param {number} rating - New rating
 * @param {number} totalReviews - Total reviews count
 * @returns {Promise<Object>} Updated doctor
 */
exports.updateDoctorRating = async (doctorId, rating, totalReviews) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      doctorId,
      {
        rating,
        totalReviews
      },
      { new: true }
    );

    if (!doctor) {
      throw new NotFoundError('Doctor');
    }

    logger.info(`Doctor rating updated`, { doctorId, rating });

    return doctor;
  } catch (error) {
    logger.error(`Update doctor rating error: ${error.message}`);
    throw error;
  }
};

/**
 * Search doctors
 * @param {string} searchTerm - Search term
 * @param {string} specialization - Specialization filter
 * @returns {Promise<Array>} Matching doctors
 */
exports.searchDoctors = async (searchTerm, specialization = null) => {
  try {
    let query = {};

    if (specialization) {
      query.specialization = specialization;
    }

    const doctors = await Doctor.find(query)
      .populate('userId', 'name email phone profileImage address')
      .exec();

    const searchLower = searchTerm.toLowerCase();
    const filtered = doctors.filter(doc =>
      doc.userId.name.toLowerCase().includes(searchLower) ||
      doc.userId.email.toLowerCase().includes(searchLower) ||
      doc.specialization.toLowerCase().includes(searchLower)
    );

    logger.debug(`Found ${filtered.length} doctors matching search`);

    return filtered;
  } catch (error) {
    logger.error(`Search doctors error: ${error.message}`);
    throw error;
  }
};