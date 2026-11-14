const Session = require('../models/session');
const Doctor = require('../models/doctor');
const SystemActivity = require('../models/SystemActivity');
const { logger } = require('../middlewares/logger');

/**
 * Helper to log session activity into SystemActivity
 */
const logSessionActivity = async (userId, activityType, description, metadata = {}) => {
  try {
    await SystemActivity.create({
      userId: userId || null,
      activityType: activityType || 'admin_action',
      description,
      status: 'success',
      resourceType: 'Session',
      metadata
    });
  } catch (err) {
    if (logger && logger.warn) logger.warn(`Failed to log system activity: ${err.message}`);
  }
};

/**
 * Helper to enrich sessions with doctor details
 */
const enrichSessionsWithDoctors = async (sessions) => {
  if (!sessions || sessions.length === 0) return [];

  // Fetch all doctors to build an efficient lookup map
  const allDoctors = await Doctor.find({}).lean();
  const doctorMap = new Map();

  allDoctors.forEach((doc) => {
    if (doc.id !== undefined && doc.id !== null) {
      doctorMap.set(String(doc.id), doc);
    }
    if (doc._id) {
      doctorMap.set(String(doc._id), doc);
    }
  });

  return sessions.map((s) => {
    const sObj = s.toObject ? s.toObject() : { ...s };
    let docInfo = null;
    if (sObj.doctorId !== undefined && sObj.doctorId !== null) {
      const match = doctorMap.get(String(sObj.doctorId));
      if (match) {
        docInfo = {
          id: match.id || match._id,
          _id: match._id,
          name: match.name,
          specialty: match.specialty || match.specialization || 'General',
          photo: match.photo || match.imageUrl || '',
          hospital: match.hospital || (match.availableHospitals && match.availableHospitals[0]) || ''
        };
      }
    }

    return {
      ...sObj,
      doctor: docInfo
    };
  });
};

/**
 * Helper to derive 3-letter day from date
 */
function deriveDayOfWeek(dateStr) {
  if (!dateStr) return 'MON';
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'MON';
  return days[d.getDay()];
}

/**
 * GET /api/admin/sessions
 * List sessions with filtering, search, pagination, and sorting
 */
exports.getSessions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      hospital,
      day,
      doctorId,
      week,
      date,
      sortBy = 'id',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Filter by Status (e.g. Available, Booked, Completed, Cancelled)
    if (status && status !== 'all') {
      query.status = { $regex: new RegExp(`^${status}$`, 'i') };
    }

    // Filter by Hospital
    if (hospital && hospital !== 'all') {
      query.hospital = { $regex: new RegExp(hospital, 'i') };
    }

    // Filter by Day of Week
    if (day && day !== 'all') {
      query.day = { $regex: new RegExp(`^${day}$`, 'i') };
    }

    // Filter by Doctor
    if (doctorId && doctorId !== 'all') {
      const numDocId = Number(doctorId);
      if (!isNaN(numDocId)) {
        query.$or = [{ doctorId: numDocId }, { doctorId: String(doctorId) }];
      } else {
        query.doctorId = doctorId;
      }
    }

    // Filter by Week
    if (week && week !== 'all') {
      query.week = week;
    }

    // Filter by Specific Date
    if (date) {
      query.date = date;
    }

    // Search query across ID, hospital, location, time, day
    if (search && search.trim()) {
      const term = search.trim();
      const numTerm = Number(term.replace(/[^0-9]/g, ''));
      const searchConditions = [
        { hospital: { $regex: term, $options: 'i' } },
        { location: { $regex: term, $options: 'i' } },
        { time: { $regex: term, $options: 'i' } },
        { day: { $regex: term, $options: 'i' } },
        { status: { $regex: term, $options: 'i' } }
      ];

      if (!isNaN(numTerm) && numTerm > 0) {
        searchConditions.push({ id: numTerm });
      }

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // Pagination & Sorting
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    const sortField = sortBy || 'id';
    const direction = sortOrder === 'desc' ? -1 : 1;
    sortOptions[sortField] = direction;

    const [total, sessions] = await Promise.all([
      Session.countDocuments(query),
      Session.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
    ]);

    const enriched = await enrichSessionsWithDoctors(sessions);

    res.status(200).json({
      success: true,
      data: enriched,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error in getSessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sessions',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/sessions/stats
 * Aggregate dashboard statistics for sessions
 */
exports.getSessionStats = async (req, res) => {
  try {
    const [total, available, booked, completed, cancelled, allSessions] = await Promise.all([
      Session.countDocuments(),
      Session.countDocuments({ status: { $regex: /^available$/i } }),
      Session.countDocuments({ status: { $regex: /^booked$/i } }),
      Session.countDocuments({ status: { $regex: /^completed$/i } }),
      Session.countDocuments({ status: { $regex: /^cancelled$/i } }),
      Session.find({}, 'hospital day totalPatients').lean()
    ]);

    // Compute total patient capacity
    const totalPatientsCapacity = allSessions.reduce((acc, s) => acc + (s.totalPatients || 0), 0);

    // Compute unique hospitals and counts
    const hospitalCountMap = {};
    const dayCountMap = { MON: 0, TUE: 0, WED: 0, THU: 0, FRI: 0, SAT: 0, SUN: 0 };

    allSessions.forEach((s) => {
      if (s.hospital) {
        hospitalCountMap[s.hospital] = (hospitalCountMap[s.hospital] || 0) + 1;
      }
      if (s.day && dayCountMap[s.day.toUpperCase()] !== undefined) {
        dayCountMap[s.day.toUpperCase()] += 1;
      }
    });

    const hospitalStats = Object.keys(hospitalCountMap).map((h) => ({
      hospital: h,
      count: hospitalCountMap[h]
    }));

    res.status(200).json({
      success: true,
      data: {
        total,
        available,
        booked,
        completed,
        cancelled,
        totalPatientsCapacity,
        hospitalStats,
        dayStats: dayCountMap
      }
    });
  } catch (error) {
    console.error('Error in getSessionStats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session statistics',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/sessions/next-id
 * Returns next suggested numeric ID for a new session
 */
exports.getNextSessionId = async (req, res) => {
  try {
    const highest = await Session.findOne().sort({ id: -1 }).select('id').lean();
    const nextId = highest && typeof highest.id === 'number' ? highest.id + 1 : 120;
    res.status(200).json({ success: true, nextId });
  } catch (error) {
    res.status(200).json({ success: true, nextId: 120 });
  }
};

/**
 * GET /api/admin/sessions/:id
 * Get single session by Mongo _id or numeric id
 */
exports.getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const idStr = String(id);
    let session = null;

    if (idStr.match(/^[0-9a-fA-F]{24}$/)) {
      session = await Session.findById(idStr);
    }
    if (!session) {
      const numId = Number(idStr);
      if (!isNaN(numId)) {
        session = await Session.findOne({ id: numId });
      }
    }

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const [enriched] = await enrichSessionsWithDoctors([session]);
    res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    console.error('Error in getSessionById:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve session', error: error.message });
  }
};

/**
 * POST /api/admin/sessions
 * Create a new medical session
 */
exports.createSession = async (req, res) => {
  try {
    const {
      id,
      doctorId,
      hospital,
      location,
      date,
      day,
      time,
      status = 'Available',
      week = 'this',
      totalPatients = 0,
      roomNumber,
      notes
    } = req.body;

    if (!hospital || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Hospital name, session date, and time range are required.'
      });
    }

    // Auto calculate day if not supplied
    const resolvedDay = day ? day.toUpperCase() : deriveDayOfWeek(date);

    // Auto determine ID if not provided
    let resolvedId = id ? Number(id) : null;
    if (!resolvedId) {
      const highest = await Session.findOne().sort({ id: -1 }).select('id').lean();
      resolvedId = highest && typeof highest.id === 'number' ? highest.id + 1 : 120;
    }

    const newSession = new Session({
      id: resolvedId,
      doctorId: doctorId || null,
      hospital: hospital.trim(),
      location: location ? location.trim() : 'Colombo',
      date: date.trim(),
      day: resolvedDay,
      time: time.trim(),
      status: status || 'Available',
      week: week || 'this',
      totalPatients: Number(totalPatients) || 0,
      roomNumber: roomNumber ? roomNumber.trim() : undefined,
      notes: notes ? notes.trim() : undefined
    });

    const saved = await newSession.save();

    await logSessionActivity(
      req.userId || null,
      'admin_action',
      `Admin created new medical session #${saved.id} at ${saved.hospital} (${saved.date} ${saved.time})`,
      { sessionId: saved._id, numericId: saved.id, hospital: saved.hospital, status: saved.status }
    );

    const [enriched] = await enrichSessionsWithDoctors([saved]);

    res.status(201).json({
      success: true,
      message: `Session #${saved.id} created successfully.`,
      data: enriched
    });
  } catch (error) {
    console.error('Error in createSession:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create session',
      error: error.message
    });
  }
};

/**
 * PUT /api/admin/sessions/:id
 * Update an existing session
 */
exports.updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const idStr = String(id);
    let session = null;

    if (idStr.match(/^[0-9a-fA-F]{24}$/)) {
      session = await Session.findById(idStr);
    }
    if (!session) {
      const numId = Number(idStr);
      if (!isNaN(numId)) {
        session = await Session.findOne({ id: numId });
      }
    }

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const {
      doctorId,
      hospital,
      location,
      date,
      day,
      time,
      status,
      week,
      totalPatients,
      roomNumber,
      notes
    } = req.body;

    if (hospital !== undefined) session.hospital = hospital.trim();
    if (location !== undefined) session.location = location.trim();
    if (date !== undefined) {
      session.date = date.trim();
      session.day = day ? day.toUpperCase() : deriveDayOfWeek(date);
    } else if (day !== undefined) {
      session.day = day.toUpperCase();
    }
    if (time !== undefined) session.time = time.trim();
    if (status !== undefined) session.status = status;
    if (week !== undefined) session.week = week;
    if (totalPatients !== undefined) session.totalPatients = Number(totalPatients);
    if (doctorId !== undefined) session.doctorId = doctorId || null;
    if (roomNumber !== undefined) session.roomNumber = roomNumber.trim();
    if (notes !== undefined) session.notes = notes.trim();

    const updated = await session.save();

    await logSessionActivity(
      req.userId || null,
      'admin_action',
      `Admin updated session #${updated.id} (${updated.hospital}, ${updated.status})`,
      { sessionId: updated._id, numericId: updated.id, hospital: updated.hospital, status: updated.status }
    );

    const [enriched] = await enrichSessionsWithDoctors([updated]);

    res.status(200).json({
      success: true,
      message: `Session #${updated.id} updated successfully.`,
      data: enriched
    });
  } catch (error) {
    console.error('Error in updateSession:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update session',
      error: error.message
    });
  }
};

/**
 * PATCH /api/admin/sessions/:id/status
 * Quick update for session status
 */
exports.updateSessionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const idStr = String(id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    let session = null;
    if (idStr.match(/^[0-9a-fA-F]{24}$/)) {
      session = await Session.findById(idStr);
    }
    if (!session) {
      const numId = Number(idStr);
      if (!isNaN(numId)) {
        session = await Session.findOne({ id: numId });
      }
    }

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const oldStatus = session.status;
    session.status = status;
    const updated = await session.save();

    await logSessionActivity(
      req.userId || null,
      'admin_action',
      `Session #${updated.id} status changed from "${oldStatus}" to "${status}"`,
      { sessionId: updated._id, numericId: updated.id, oldStatus, newStatus: status }
    );

    const [enriched] = await enrichSessionsWithDoctors([updated]);

    res.status(200).json({
      success: true,
      message: `Session #${updated.id} status updated to ${status}.`,
      data: enriched
    });
  } catch (error) {
    console.error('Error in updateSessionStatus:', error);
    res.status(500).json({ success: false, message: 'Failed to update status', error: error.message });
  }
};

/**
 * DELETE /api/admin/sessions/:id
 * Delete a session
 */
exports.deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const idStr = String(id);
    let session = null;

    if (idStr.match(/^[0-9a-fA-F]{24}$/)) {
      session = await Session.findById(idStr);
    }
    if (!session) {
      const numId = Number(idStr);
      if (!isNaN(numId)) {
        session = await Session.findOne({ id: numId });
      }
    }

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const deletedId = session.id;
    const deletedHospital = session.hospital;
    await session.deleteOne();

    await logSessionActivity(
      req.userId || null,
      'admin_action',
      `Admin deleted medical session #${deletedId} (${deletedHospital})`,
      { numericId: deletedId, hospital: deletedHospital }
    );

    res.status(200).json({
      success: true,
      message: `Session #${deletedId} deleted successfully.`
    });
  } catch (error) {
    console.error('Error in deleteSession:', error);
    res.status(500).json({ success: false, message: 'Failed to delete session', error: error.message });
  }
};
