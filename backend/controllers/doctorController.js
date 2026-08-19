const mongoose = require('mongoose');
const Doctor = require('../models/doctor');
const User = require('../models/user');
const Appointment = require('../models/appointment');
const SystemActivity = require('../models/SystemActivity');
const { NotFoundError, ValidationError, DuplicateError } = require('../utils/errorHandler');
const { logger } = require('../middlewares/logger');

/**
 * Get all doctors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllDoctors = async (req, res, next) => {
  try {
    const { specialization, status, isVerified, search, page = 1, limit = 50 } = req.query;

    let query = {};

    if (specialization) {
      query.specialization = specialization;
    }

    if (status) {
      query.status = status;
    }

    if (isVerified !== undefined && isVerified !== 'all') {
      query.isVerified = isVerified === 'true' || isVerified === true;
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
        doc.name?.toLowerCase().includes(searchLower) ||
        doc.userId?.name?.toLowerCase().includes(searchLower) ||
        doc.email?.toLowerCase().includes(searchLower) ||
        doc.userId?.email?.toLowerCase().includes(searchLower) ||
        doc.specialty?.toLowerCase().includes(searchLower) ||
        doc.specialization?.toLowerCase().includes(searchLower) ||
        doc.licenseNumber?.toLowerCase().includes(searchLower) ||
        doc.nic?.toLowerCase().includes(searchLower)
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
      specialty,
      licenseNumber,
      experience,
      yearsOfExperience,
      qualifications,
      consultationFee,
      password,
      status,
      rating,
      bio,
      photo,
      languages,
      licenseDocument,
      isVerified
    } = req.body;

    const spec = specialization || specialty;

    // Validate required fields
    if (!name || !email || !spec) {
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
      mobile: phone || '0000000000',
      gender: 'Not Specified',
      city: address || 'Not Specified',
      dob: new Date('1980-01-01')
    });

    await user.save();

    try {
      // Find max id
      const lastDoctor = await Doctor.findOne().sort({ id: -1 }).select('id');
      const nextId = (lastDoctor && lastDoctor.id) ? Number(lastDoctor.id) + 1 : 1;

      // When admin creates doctor, default isVerified to true unless explicitly specified
      const verifiedFlag = isVerified !== undefined ? (isVerified === true || isVerified === 'true') : true;

      // Create Doctor profile linked to the user
      const doctor = new Doctor({
        id: nextId,
        userId: user._id,
        name,
        email,
        phone: phone || '',
        address: address || '',
        licenseNumber: licenseNumber || `SLMC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        nic: nic || '',
        specialization: spec,
        specialty: spec,
        experience: experience !== undefined ? experience : (yearsOfExperience || 0),
        yearsOfExperience: yearsOfExperience !== undefined ? yearsOfExperience : (experience || 0),
        qualifications: qualifications || [],
        consultationFee: consultationFee || 0,
        virtualPrice: consultationFee || 1500,
        physicalPrice: consultationFee || 2000,
        status: status || 'active',
        rating: rating || 0,
        bio: bio || '',
        photo: photo || `https://ui-avatars.com/api/?background=1565c0&color=fff&size=120&name=${encodeURIComponent(name)}`,
        languages: languages || ['English', 'Sinhala'],
        licenseDocument: licenseDocument || '',
        isVerified: verifiedFlag,
        verifiedAt: verifiedFlag ? new Date() : undefined,
        verifiedBy: verifiedFlag ? (req.userId || undefined) : undefined
      });

      await doctor.save();

      // Populate the response with user data
      const populatedDoctor = await Doctor.findById(doctor._id)
        .populate('userId', 'name email phone address profileImage');

      logger.info(`Doctor created by admin`, { doctorId: doctor._id, email });

      // Log system activity
      await new SystemActivity({
        userId: req.userId,
        activityType: 'doctor_profile_added',
        description: `New doctor added: ${name} (${specialization})`,
        resourceType: 'Doctor',
        resourceId: doctor._id
      }).save();

      res.status(201).json({
        success: true,
        message: 'Doctor created successfully',
        data: populatedDoctor
      });
    } catch (error) {
      // Rollback user creation if doctor creation fails
      await User.findByIdAndDelete(user._id);
      throw error;
    }
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
      specialty,
      licenseNumber,
      experience,
      qualifications,
      consultationFee,
      status,
      rating
    } = req.body;

    // Find the doctor
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return next(new NotFoundError('Doctor'));
    }

    // Check if this is a flat document (no userId) or linked document
    const isFlat = !doctor.userId;

    if (isFlat) {
      // ── FLAT DOCUMENT: update fields directly on the Doctor record ──
      if (name !== undefined) doctor.name = name;
      if (email !== undefined) doctor.email = email;
      if (phone !== undefined) doctor.phone = phone;
      if (address !== undefined) doctor.address = address;
    } else {
      // ── LINKED DOCUMENT: update the User record ──
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

      const userUpdate = {};
      if (name !== undefined) userUpdate.name = name;
      if (email !== undefined) userUpdate.email = email;
      if (phone !== undefined) userUpdate.mobile = phone;
      if (address !== undefined) userUpdate.city = address;
      userUpdate.updatedAt = new Date();

      await User.findByIdAndUpdate(doctor.userId, userUpdate);
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

    // Update Doctor record fields
    const spec = specialization || specialty;
    if (spec !== undefined) {
      doctor.specialization = spec;
      doctor.specialty = spec;
    }
    if (licenseNumber !== undefined) doctor.licenseNumber = licenseNumber;
    if (nic !== undefined) doctor.nic = nic;
    if (experience !== undefined) doctor.experience = experience;
    if (qualifications !== undefined) doctor.qualifications = qualifications;
    if (consultationFee !== undefined) doctor.consultationFee = consultationFee;
    if (status !== undefined) doctor.status = status;
    if (rating !== undefined) doctor.rating = rating;

    await doctor.save();

    // Populate and return
    let populatedDoctor;
    if (isFlat) {
      populatedDoctor = doctor;
    } else {
      populatedDoctor = await Doctor.findById(doctor._id)
        .populate('userId', 'name email phone address profileImage');
    }

    const doctorName = isFlat ? doctor.name : (populatedDoctor.userId?.name || 'Unknown');
    logger.info(`Doctor updated`, { doctorId: req.params.id, status });

    // Log system activity
    try {
      await new SystemActivity({
        userId: req.userId || null,
        activityType: 'doctor_updated',
        description: `Doctor profile updated: ${doctorName}${status ? ` (status: ${status})` : ''}`,
        resourceType: 'Doctor',
        resourceId: doctor._id
      }).save();
    } catch (actErr) {
      logger.warn(`Failed to log system activity: ${actErr.message}`);
    }

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

    const doctorUserId = new mongoose.Types.ObjectId(req.userId);
    let doctor = await Doctor.findOne({ userId: doctorUserId });

    if (!doctor) {
      // Find max id
      const lastDoctor = await Doctor.findOne().sort({ id: -1 }).select('id');
      const nextId = (lastDoctor && lastDoctor.id) ? Number(lastDoctor.id) + 1 : 1;
      
      const user = await User.findById(req.userId);

      doctor = new Doctor({
        id: nextId,
        userId: doctorUserId,
        name: user ? user.name : 'Doctor',
        licenseNumber,
        specialty: specialization,
        specialization,
        experience: experience || 0,
        yearsOfExperience: experience || 0,
        qualifications: qualifications || [],
        consultationFee: consultationFee || 0,
        virtualPrice: consultationFee || 1500,
        physicalPrice: consultationFee || 2000,
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

    // Log system activity
    await new SystemActivity({
      userId: req.userId,
      activityType: 'doctor_deleted',
      description: `Doctor removed from system`,
      resourceType: 'Doctor',
      resourceId: req.params.id
    }).save();

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

/**
 * Verify / Approve or Reject Doctor (Admin endpoint)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verifyDoctor = async (req, res, next) => {
  try {
    const { isVerified, verificationNotes, rejectionReason, status } = req.body;
    const doctorId = req.params.id;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return next(new NotFoundError('Doctor'));
    }

    const willBeVerified = isVerified === true || isVerified === 'true';
    doctor.isVerified = willBeVerified;

    if (willBeVerified) {
      doctor.verifiedAt = new Date();
      doctor.verifiedBy = req.userId || null;
      doctor.rejectionReason = undefined;
      if (status) {
        doctor.status = status;
      } else if (doctor.status === 'inactive') {
        doctor.status = 'active';
      }
    } else {
      doctor.rejectionReason = rejectionReason || 'Verification rejected by administrator';
      doctor.verifiedAt = undefined;
      if (status) {
        doctor.status = status;
      }
    }

    if (verificationNotes !== undefined) {
      doctor.verificationNotes = verificationNotes;
    }

    await doctor.save();

    const isFlat = !doctor.userId;
    let populatedDoctor;
    if (isFlat) {
      populatedDoctor = doctor;
    } else {
      populatedDoctor = await Doctor.findById(doctor._id)
        .populate('userId', 'name email phone address profileImage');
    }

    const doctorName = isFlat ? doctor.name : (populatedDoctor.userId?.name || 'Doctor');

    // Log system activity
    try {
      await new SystemActivity({
        userId: req.userId || null,
        activityType: willBeVerified ? 'doctor_verified' : 'doctor_verification_rejected',
        description: willBeVerified
          ? `Doctor verified & approved: ${doctorName} (License: ${doctor.licenseNumber || 'N/A'})`
          : `Doctor verification rejected: ${doctorName}${rejectionReason ? ` - Reason: ${rejectionReason}` : ''}`,
        resourceType: 'Doctor',
        resourceId: doctor._id
      }).save();
    } catch (actErr) {
      logger.warn(`Failed to log system activity: ${actErr.message}`);
    }

    logger.info(`Doctor verification updated`, { doctorId: doctor._id, isVerified: willBeVerified });

    res.json({
      success: true,
      message: willBeVerified ? 'Doctor verified and approved successfully' : 'Doctor verification rejected',
      data: populatedDoctor
    });
  } catch (error) {
    logger.error(`Verify doctor error: ${error.message}`);
    next(error);
  }
};

/**
 * Get Doctor Approval Statistics (Admin endpoint)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getApprovalStats = async (req, res, next) => {
  try {
    const total = await Doctor.countDocuments();
    const pending = await Doctor.countDocuments({ isVerified: false });
    const verified = await Doctor.countDocuments({ isVerified: true });
    const active = await Doctor.countDocuments({ status: 'active' });
    const onLeave = await Doctor.countDocuments({ status: 'on-leave' });
    const inactive = await Doctor.countDocuments({ status: 'inactive' });

    res.json({
      success: true,
      data: {
        total,
        pending,
        verified,
        active,
        onLeave,
        inactive
      }
    });
  } catch (error) {
    logger.error(`Get approval stats error: ${error.message}`);
    next(error);
  }
};