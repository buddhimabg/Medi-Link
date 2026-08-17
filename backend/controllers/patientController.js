const Patient = require('../models/Patient');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const SystemActivity = require('../models/SystemActivity');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const { logger } = require('../middleware/logger');

/**
 * Get all patients
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllPatients = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const Doctor = require('../models/Doctor');

    const patients = await Patient.find(query)
      .populate('userId', 'name email phone profileImage address')
      .populate({
        path: 'assignedDoctor',
        select: 'name userId',
        populate: {
          path: 'userId',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const doctors = await Doctor.find({}).populate('userId', 'name');
    
    for (let patient of patients) {
      if (!patient.assignedDoctor && doctors.length > 0) {
        const randomDoctor = doctors[Math.floor(Math.random() * doctors.length)];
        patient.assignedDoctor = randomDoctor._id;
        
        // Fix validation errors on existing faulty data
        if (patient.gender) {
          patient.gender = patient.gender.toLowerCase();
        }
        if (patient.bloodType === null) {
          patient.bloodType = undefined;
        }

        try {
          await patient.save();
        } catch (err) {
          console.error("Error saving patient inside getAllPatients", err);
        }
        
        patient.assignedDoctor = randomDoctor; // populate for current response
      }
    }

    const total = await Patient.countDocuments(query);

    // Filter by search term
    let filteredPatients = patients;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredPatients = patients.filter(patient =>
        patient.userId.name.toLowerCase().includes(searchLower) ||
        patient.userId.email.toLowerCase().includes(searchLower)
      );
    }

    logger.debug(`Retrieved ${filteredPatients.length} patients`);

    res.json({
      success: true,
      count: filteredPatients.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: filteredPatients
    });
  } catch (error) {
    logger.error(`Get all patients error: ${error.message}`);
    next(error);
  }
};

/**
 * Get patient by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getPatientById = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('userId', 'name email phone address profileImage');

    if (!patient) {
      return next(new NotFoundError('Patient'));
    }

    logger.debug(`Retrieved patient: ${req.params.id}`);

    res.json({
      success: true,
      data: patient
    });
  } catch (error) {
    logger.error(`Get patient by ID error: ${error.message}`);
    next(error);
  }
};

/**
 * Update patient profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updatePatientProfile = async (req, res, next) => {
  try {
    const {
      dateOfBirth,
      gender,
      bloodType,
      medicalHistory,
      allergies,
      emergencyContact,
      insurance
    } = req.body;

    let patient = await Patient.findById(req.params.id);

    if (!patient) {
      return next(new NotFoundError('Patient'));
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

    logger.info(`Patient profile updated`, { patientId: req.params.id });

    // Log system activity
    await new SystemActivity({
      userId: req.userId,
      activityType: 'patient_updated',
      description: `Patient profile updated: ${populatedPatient.userId?.name || 'Unknown'}`,
      resourceType: 'Patient',
      resourceId: patient._id
    }).save();

    res.json({
      success: true,
      message: 'Patient profile updated successfully',
      data: populatedPatient
    });
  } catch (error) {
    logger.error(`Update patient profile error: ${error.message}`);
    next(error);
  }
};

/**
 * Delete patient
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deletePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);

    if (!patient) {
      return next(new NotFoundError('Patient'));
    }

    // Delete associated user
    await User.findByIdAndDelete(patient.userId);

    logger.info(`Patient deleted`, { patientId: req.params.id });

    // Log system activity
    await new SystemActivity({
      userId: req.userId,
      activityType: 'patient_deleted',
      description: `Patient removed from system`,
      resourceType: 'Patient',
      resourceId: req.params.id
    }).save();

    res.json({
      success: true,
      message: 'Patient deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete patient error: ${error.message}`);
    next(error);
  }
};

/**
 * Get patient statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getPatientStatistics = async (req, res, next) => {
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

    res.json({
      success: true,
      data: {
        totalPatients,
        activePatients,
        inactivePatients,
        newThisMonth: thisMonthPatients
      }
    });
  } catch (error) {
    logger.error(`Get patient statistics error: ${error.message}`);
    next(error);
  }
};

/**
 * Get patient appointments
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getPatientAppointments = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { status } = req.query;

    let query = { patientId };

    if (status) {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .populate('doctorId', 'specialization')
      .sort({ appointmentDate: -1 });

    logger.debug(`Retrieved ${appointments.length} appointments for patient`);

    res.json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    logger.error(`Get patient appointments error: ${error.message}`);
    next(error);
  }
};

/**
 * Get patient medical history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getPatientMedicalHistory = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findById(patientId);

    if (!patient) {
      return next(new NotFoundError('Patient'));
    }

    logger.debug(`Retrieved medical history for patient`);

    res.json({
      success: true,
      data: {
        medicalHistory: patient.medicalHistory,
        allergies: patient.allergies,
        bloodType: patient.bloodType
      }
    });
  } catch (error) {
    logger.error(`Get patient medical history error: ${error.message}`);
    next(error);
  }
};