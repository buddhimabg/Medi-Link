const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { NotFoundError, ValidationError, DuplicateError } = require('../utils/errorHandler');
const { logger } = require('../middleware/logger');

/**
 * Get all doctors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllDoctors = async (req, res, next) => {
  try {
    const { specialization, status, search, page = 1, limit = 50 } = req.query;

    let query = {};

    if (specialization) {
      query.specialization = specialization;
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const doctors = await Doctor.find(query)
      .populate('userId', 'name email phone profileImage address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Doctor.countDocuments(query);

    // Filter by search term
    let filteredDoctors = doctors;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredDoctors = doctors.filter(doc =>
        doc.userId?.name?.toLowerCase().includes(searchLower) ||
        doc.userId?.email?.toLowerCase().includes(searchLower) ||
        doc.specialization?.toLowerCase().includes(searchLower)
      );
    }

    logger.debug(`Retrieved ${filteredDoctors.length} doctors`);

    res.json({
      success: true,
      count: filteredDoctors.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: filteredDoctors
    });
  } catch (error) {
    logger.error(`Get all doctors error: ${error.message}`);
    next(error);
  }
};

/**
 * Get doctor by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDoctorById = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('userId', 'name email phone address profileImage');

    if (!doctor) {
      return next(new NotFoundError('Doctor'));
    }

    logger.debug(`Retrieved doctor: ${req.params.id}`);

    res.json({
      success: true,
      data: doctor
    });
  } catch (error) {
    logger.error(`Get doctor by ID error: ${error.message}`);
    next(error);
  }
};

/**
 * Create a new doctor (Admin endpoint)
 * Creates both a User record (role=doctor) and a linked Doctor profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createDoctor = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      nic,
      specialization,
      licenseNumber,
      experience,
      qualifications,
      consultationFee,
      password
    } = req.body;

    // Validate required fields
    if (!name || !email || !specialization) {
      return next(new ValidationError('Name, email, and specialization are required'));
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new DuplicateError('Email', email));
    }

    // Check if license number already exists (if provided)
    if (licenseNumber) {
      const existingDoctor = await Doctor.findOne({ licenseNumber });
      if (existingDoctor) {
        return next(new DuplicateError('License Number', licenseNumber));
      }
    }

    // Create User record with role 'doctor'
    const user = new User({
      name,
      email,
      password: password || 'Doctor@123456', // Default password
      role: 'doctor',
      phone: phone || '',
      address: address || '',
      isActive: true,
      emailVerified: false
    });

    await user.save();

    // Create Doctor profile linked to the user
    const doctor = new Doctor({
      userId: user._id,
      licenseNumber: licenseNumber || `LIC-${Date.now()}`,
      nic: nic || '',
      specialization,
      experience: experience || 0,
      qualifications: qualifications || [],
      consultationFee: consultationFee || 0,
      status: 'active',
      isVerified: false
    });

    await doctor.save();

    // Populate the response with user data
    const populatedDoctor = await Doctor.findById(doctor._id)
      .populate('userId', 'name email phone address profileImage');

    logger.info(`Doctor created by admin`, { doctorId: doctor._id, email });

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: populatedDoctor
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return next(new DuplicateError(field, error.keyValue?.[field]));
    }
    logger.error(`Create doctor error: ${error.message}`);
    next(error);
  }
};

/**
 * Update doctor (Admin endpoint)
 * Updates both User and Doctor records
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateDoctor = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      nic,
      specialization,
      licenseNumber,
      experience,
      qualifications,
      consultationFee,
      status
    } = req.body;

    // Find the doctor
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return next(new NotFoundError('Doctor'));
    }

    // Check if email already exists (if changing email)
    if (email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: doctor.userId }
      });
      if (existingUser) {
        return next(new DuplicateError('Email', email));
      }
    }

    // Check if license number already exists (if changing)
    if (licenseNumber && licenseNumber !== doctor.licenseNumber) {
      const existingDoctor = await Doctor.findOne({
        licenseNumber,
        _id: { $ne: doctor._id }
      });
      if (existingDoctor) {
        return next(new DuplicateError('License Number', licenseNumber));
      }
    }

    // Update User record
    const userUpdate = {};
    if (name !== undefined) userUpdate.name = name;
    if (email !== undefined) userUpdate.email = email;
    if (phone !== undefined) userUpdate.phone = phone;
    if (address !== undefined) userUpdate.address = address;
    userUpdate.updatedAt = new Date();

    await User.findByIdAndUpdate(doctor.userId, userUpdate);

    // Update Doctor record
    if (specialization !== undefined) doctor.specialization = specialization;
    if (licenseNumber !== undefined) doctor.licenseNumber = licenseNumber;
    if (nic !== undefined) doctor.nic = nic;
    if (experience !== undefined) doctor.experience = experience;
    if (qualifications !== undefined) doctor.qualifications = qualifications;
    if (consultationFee !== undefined) doctor.consultationFee = consultationFee;
    if (status !== undefined) doctor.status = status;

    await doctor.save();

    // Populate and return
    const populatedDoctor = await Doctor.findById(doctor._id)
      .populate('userId', 'name email phone address profileImage');

    logger.info(`Doctor updated`, { doctorId: req.params.id });

    res.json({
      success: true,
      message: 'Doctor updated successfully',
      data: populatedDoctor
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return next(new DuplicateError(field, error.keyValue?.[field]));
    }
    logger.error(`Update doctor error: ${error.message}`);
    next(error);
  }
};

/**
 * Create or update doctor profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createOrUpdateDoctorProfile = async (req, res, next) => {
  try {
    const {
      licenseNumber,
      specialization,
      experience,
      qualifications,
      consultationFee,
      availability,
      status
    } = req.body;

    // Validate required fields
    if (!licenseNumber || !specialization) {
      return next(new ValidationError('License number and specialization are required'));
    }

    let doctor = await Doctor.findOne({ userId: req.userId });

    if (!doctor) {
      doctor = new Doctor({
        userId: req.userId,
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

    logger.info(`Doctor profile updated/created`, { userId: req.userId });

    res.json({
      success: true,
      message: 'Doctor profile updated successfully',
      data: populatedDoctor
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new DuplicateError('License Number', req.body.licenseNumber));
    }
    logger.error(`Create/update doctor profile error: ${error.message}`);
    next(error);
  }
};

/**
 * Update doctor status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateDoctorStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status) {
      return next(new ValidationError('Status is required'));
    }

    const validStatuses = ['active', 'on-leave', 'inactive'];
    if (!validStatuses.includes(status)) {
      return next(new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`));
    }

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('userId', 'name email');

    if (!doctor) {
      return next(new NotFoundError('Doctor'));
    }

    logger.info(`Doctor status updated`, { doctorId: req.params.id, status });

    res.json({
      success: true,
      message: 'Doctor status updated successfully',
      data: doctor
    });
  } catch (error) {
    logger.error(`Update doctor status error: ${error.message}`);
    next(error);
  }
};

/**
 * Delete doctor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(new NotFoundError('Doctor'));
    }

    // Store userId before deletion
    const userId = doctor.userId;

    // Delete doctor record
    await Doctor.findByIdAndDelete(req.params.id);

    // Delete associated user
    await User.findByIdAndDelete(userId);

    logger.info(`Doctor deleted`, { doctorId: req.params.id });

    res.json({
      success: true,
      message: 'Doctor deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete doctor error: ${error.message}`);
    next(error);
  }
};

/**
 * Get doctor statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDoctorStatistics = async (req, res, next) => {
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

    res.json({
      success: true,
      data: {
        totalDoctors,
        activeDoctors,
        onLeaveDoctors,
        inactiveDoctors,
        averageRating: avgRating[0]?.avgRating || 0
      }
    });
  } catch (error) {
    logger.error(`Get doctor statistics error: ${error.message}`);
    next(error);
  }
};

/**
 * Get doctor appointments
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDoctorAppointments = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { status, startDate, endDate } = req.query;

    let query = { doctorId };

    if (status) {
      query.status = status;
    }

    if (startDate && endDate) {
      query.appointmentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'name email')
      .sort({ appointmentDate: -1 });

    logger.debug(`Retrieved ${appointments.length} appointments for doctor`);

    res.json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    logger.error(`Get doctor appointments error: ${error.message}`);
    next(error);
  }
};