const Patient = require('../models/Patient');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const { logger } = require('../middleware/logger');
const { getAge } = require('../utils/dateHelpers');

/**
 * Patient Service
 * Handles all patient-related business logic
 */

/**
 * Get all patients with filters
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Records per page
 * @returns {Promise<Object>} Patients list and metadata
 */
exports.getAllPatients = async (filters = {}, page = 1, limit = 10) => {
  try {
    let query = {};

    if (filters.status) {
      query.status = filters.status;
    }

    const skip = (page - 1) * limit;

    const patients = await Patient.find(query)
      .populate('userId', 'name email phone profileImage address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Patient.countDocuments(query);

    logger.debug(`Retrieved ${patients.length} patients`);

    return {
      patients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error(`Get all patients error: ${error.message}`);
    throw error;
  }
};

/**
 * Get patient by ID
 * @param {string} patientId - Patient ID
 * @returns {Promise<Object>} Patient details
 */
exports.getPatientById = async (patientId) => {
  try {
    const patient = await Patient.findById(patientId)
      .populate('userId', 'name email phone address profileImage');

    if (!patient) {
      throw new NotFoundError('Patient');
    }

    logger.debug(`Retrieved patient: ${patientId}`);

    return patient;
  } catch (error) {
    logger.error(`Get patient by ID error: ${error.message}`);
    throw error;
  }
};

/**
 * Update patient profile
 * @param {string} patientId - Patient ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated patient
 */
exports.updatePatientProfile = async (patientId, updateData) => {
  try {
    const {
      dateOfBirth,
      gender,
      bloodType,
      medicalHistory,
      allergies,
      emergencyContact,
      insurance
    } = updateData;

    const patient = await Patient.findById(patientId);

    if (!patient) {
      throw new NotFoundError('Patient');
    }

    patient.dateOfBirth = dateOfBirth || patient.dateOfBirth;
    patient.gender = gender || patient.gender;
    patient.bloodType = bloodType || patient.bloodType;
    patient.medicalHistory = medicalHistory || patient.medicalHistory;
    patient.allergies = allergies || patient.allergies;
    patient.emergencyContact = emergencyContact || patient.emergencyContact;
    patient.insurance = insurance || patient.insurance;

    await patient.save();

    const populatedPatient = await patient.populate('userId', 'name email phone');

    logger.info(`Patient profile updated`, { patientId });

    return populatedPatient;
  } catch (error) {
    logger.error(`Update patient profile error: ${error.message}`);
    throw error;
  }
};

/**
 * Delete patient
 * @param {string} patientId - Patient ID
 * @returns {Promise<void>}
 */
exports.deletePatient = async (patientId) => {
  try {
    const patient = await Patient.findByIdAndDelete(patientId);

    if (!patient) {
      throw new NotFoundError('Patient');
    }

    // Delete associated user
    await User.findByIdAndDelete(patient.userId);

    logger.info(`Patient deleted`, { patientId });
  } catch (error) {
    logger.error(`Delete patient error: ${error.message}`);
    throw error;
  }
};

/**
 * Get patient statistics
 * @returns {Promise<Object>} Patient statistics
 */
exports.getPatientStatistics = async () => {
  try {
    const totalPatients = await Patient.countDocuments();
    const activePatients = await Patient.countDocuments({ status: 'active' });
    const inactivePatients = await Patient.countDocuments({ status: 'inactive' });

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const thisMonthPatients = await Patient.countDocuments({
      createdAt: { $gte: thisMonthStart }
    });

    logger.debug(`Retrieved patient statistics`);

    return {
      totalPatients,
      activePatients,
      inactivePatients,
      newThisMonth: thisMonthPatients
    };
  } catch (error) {
    logger.error(`Get patient statistics error: ${error.message}`);
    throw error;
  }
};

/**
 * Get patient appointments
 * @param {string} patientId - Patient ID
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} Appointments list
 */
exports.getPatientAppointments = async (patientId, filters = {}) => {
  try {
    let query = { patientId };

    if (filters.status) {
      query.status = filters.status;
    }

    const appointments = await Appointment.find(query)
      .populate('doctorId', 'specialization')
      .sort({ appointmentDate: -1 });

    logger.debug(`Retrieved ${appointments.length} appointments for patient`);

    return appointments;
  } catch (error) {
    logger.error(`Get patient appointments error: ${error.message}`);
    throw error;
  }
};

/**
 * Get patient medical history
 * @param {string} patientId - Patient ID
 * @returns {Promise<Object>} Medical history
 */
exports.getPatientMedicalHistory = async (patientId) => {
  try {
    const patient = await Patient.findById(patientId);

    if (!patient) {
      throw new NotFoundError('Patient');
    }

    logger.debug(`Retrieved medical history for patient`);

    return {
      medicalHistory: patient.medicalHistory,
      allergies: patient.allergies,
      bloodType: patient.bloodType,
      medications: patient.medications
    };
  } catch (error) {
    logger.error(`Get patient medical history error: ${error.message}`);
    throw error;
  }
};

/**
 * Add medical history entry
 * @param {string} patientId - Patient ID
 * @param {Object} historyEntry - History entry data
 * @returns {Promise<Object>} Updated patient
 */
exports.addMedicalHistory = async (patientId, historyEntry) => {
  try {
    const patient = await Patient.findById(patientId);

    if (!patient) {
      throw new NotFoundError('Patient');
    }

    patient.medicalHistory.push(historyEntry);
    await patient.save();

    logger.info(`Medical history added for patient`, { patientId });

    return patient;
  } catch (error) {
    logger.error(`Add medical history error: ${error.message}`);
    throw error;
  }
};

/**
 * Add allergy entry
 * @param {string} patientId - Patient ID
 * @param {Object} allergyEntry - Allergy entry data
 * @returns {Promise<Object>} Updated patient
 */
exports.addAllergy = async (patientId, allergyEntry) => {
  try {
    const patient = await Patient.findById(patientId);

    if (!patient) {
      throw new NotFoundError('Patient');
    }

    patient.allergies.push(allergyEntry);
    await patient.save();

    logger.info(`Allergy added for patient`, { patientId });

    return patient;
  } catch (error) {
    logger.error(`Add allergy error: ${error.message}`);
    throw error;
  }
};

/**
 * Search patients
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Matching patients
 */
exports.searchPatients = async (searchTerm) => {
  try {
    const patients = await Patient.find()
      .populate('userId', 'name email phone profileImage address')
      .exec();

    const searchLower = searchTerm.toLowerCase();
    const filtered = patients.filter(patient =>
      patient.userId.name.toLowerCase().includes(searchLower) ||
      patient.userId.email.toLowerCase().includes(searchLower)
    );

    logger.debug(`Found ${filtered.length} patients matching search`);

    return filtered;
  } catch (error) {
    logger.error(`Search patients error: ${error.message}`);
    throw error;
  }
};

/**
 * Get patient age
 * @param {string} patientId - Patient ID
 * @returns {Promise<number>} Age in years
 */
exports.getPatientAge = async (patientId) => {
  try {
    const patient = await Patient.findById(patientId);

    if (!patient || !patient.dateOfBirth) {
      return null;
    }

    return getAge(patient.dateOfBirth);
  } catch (error) {
    logger.error(`Get patient age error: ${error.message}`);
    throw error;
  }
};