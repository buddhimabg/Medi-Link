// src/controllers/videoCallController.js
const crypto         = require('crypto');
const VideoSession   = require('../models/VideoSession');
const Prescription   = require('../models/Prescription');
const PatientHistory = require('../models/PatientHistory');
const User           = require('../models/User');

// ZegoCloud Token Generator (Token04 spec)
const generateToken04 = (appId, userId, serverSecret, effectiveTimeInSeconds, payload = '') => {
  if (!appId || !userId || !serverSecret) return '';
  const createTime = Math.floor(Date.now() / 1000);
  const tokenInfo  = {
    app_id:  appId,
    user_id: userId,
    nonce:   Math.floor(Math.random() * 2147483647),
    ctime:   createTime,
    expire:  createTime + effectiveTimeInSeconds,
    payload,
  };
  const plaintext = JSON.stringify(tokenInfo);
  const iv        = crypto.randomBytes(16);
  const key       = Buffer.from(serverSecret, 'utf8').slice(0, 16);
  const cipher    = crypto.createCipheriv('aes-128-cbc', key, iv);
  let encrypted   = cipher.update(plaintext, 'utf8', 'binary');
  encrypted      += cipher.final('binary');
  const hash      = Buffer.concat([iv, Buffer.from(encrypted, 'binary')]);
  return '04' + hash.toString('base64');
};

const buildCallData = (session, token, userId, userName) => ({
  roomId:    session.roomId,
  token,
  appId:     parseInt(process.env.ZEGO_APP_ID) || 0,
  userId,
  userName,
  sessionId: session.sessionId,
});

// --- අලුතින් එකතු කරන ලද ශ්‍රිතය ---
// POST /api/video/invite/:sessionId
exports.sendInvitation = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const io = req.app.get('io'); 

    // රෝගියා සිටින session room එකට 'receive-invitation' event එක emit කරයි
    io.to(`session:${sessionId}`).emit('receive-invitation', {
      message: "වෛද්‍යවරයා ඔබව ඇමතීමට සූදානම්. කරුණාකර සම්බන්ධ වන්න.",
      sessionId: sessionId,
      timestamp: new Date()
    });

    console.log(`✉️ Invitation sent to session:${sessionId}`);
    return res.status(200).json({ success: true, message: "Invitation sent successfully" });
  } catch (error) {
    console.error("Invitation error:", error);
    return res.status(500).json({ success: false, message: "Failed to send invitation" });
  }
};
// ------------------------------------

// POST /api/video/create-room
exports.createRoom = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId is required.' });

    const appId        = parseInt(process.env.ZEGO_APP_ID);
    const serverSecret = process.env.ZEGO_SERVER_SECRET;
    const doctorId     = req.user?.id   || 'doctor';
    const doctorName   = req.user?.name || 'Doctor';
    const userId       = `doctor_${doctorId}`;

    let session = await VideoSession.findOne({ sessionId });
    if (!session) {
      session = await VideoSession.create({
        sessionId,
        doctorId,
        roomId:       sessionId,
        status:       'waiting',
        callMetadata: { appId, doctorUserId: userId },
      });
    } else if (session.status === 'ended' || session.status === 'cancelled') {
      session.status    = 'waiting';
      session.endedAt   = null;
      session.startedAt = null;
      session.duration  = 0;
      session.patientId = null;
      session.callMetadata.patientUserId = '';
      await session.save();
    }

    const token    = generateToken04(appId, userId, serverSecret, 3600);
    const callData = buildCallData(session, token, userId, doctorName);
    console.log(`Room created — session: ${sessionId}, doctor: ${doctorId}`);
    return res.status(200).json({ success: true, data: callData });
  } catch (error) {
    console.error('createRoom error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// POST /api/video/join-room
exports.joinRoom = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId is required.' });

    const session = await VideoSession.findOne({ sessionId });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    if (session.status === 'ended' || session.status === 'cancelled') {
      return res.status(400).json({ success: false, message: `Session is already ${session.status}.` });
    }

    const appId        = parseInt(process.env.ZEGO_APP_ID);
    const serverSecret = process.env.ZEGO_SERVER_SECRET;
    const patientId    = req.user?.id   || 'patient';
    const patientName  = req.user?.name || 'Patient';
    const userId       = `patient_${patientId}`;

    session.patientId                    = patientId;
    session.status                       = 'active';
    session.startedAt                    = session.startedAt || new Date();
    session.callMetadata.patientUserId = userId;
    await session.save();

    const token    = generateToken04(appId, userId, serverSecret, 3600);
    const callData = buildCallData(session, token, userId, patientName);
    console.log(`Patient joined — session: ${sessionId}, patient: ${patientId}`);
    return res.status(200).json({ success: true, data: callData });
  } catch (error) {
    console.error('joinRoom error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// GET /api/video/session-status/:sessionId  (no auth — polling)
exports.getSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await VideoSession.findOne({ sessionId }, { status: 1, patientId: 1, startedAt: 1 });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    let patientName = null;
    if (session.patientId) {
      try {
        const patient = await User.findById(session.patientId, 'name');
        patientName   = patient?.name || null;
      } catch { /* non-blocking */ }
    }

    return res.status(200).json({
      success: true,
      data: {
        sessionId,
        status:        session.status,
        patientJoined: session.status === 'active' && !!session.patientId,
        patientName,
        patientId:     session.patientId || null,
        startedAt:     session.startedAt,
      },
    });
  } catch (error) {
    console.error('getSessionStatus error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// PATCH /api/video/end-call/:sessionId
exports.endCall = async (req, res) => {
  try {
    const { sessionId }                = req.params;
    const { duration, sessionNotes } = req.body;

    const session = await VideoSession.findOne({ sessionId });
    if (!session) {
      console.warn(`endCall: session ${sessionId} not found in DB`);
      return res.status(200).json({ success: true, data: { sessionId, duration } });
    }

    session.status   = 'ended';
    session.endedAt  = new Date();
    session.duration = typeof duration === 'number' ? duration : 0;
    if (!session.startedAt) session.startedAt = new Date(Date.now() - session.duration * 1000);
    if (typeof sessionNotes === 'string') session.sessionNotes = sessionNotes;
    await session.save();

    if (session.patientId) {
      try {
        const prescriptions = await Prescription.find({ sessionId }).sort({ issuedAt: -1 });
        const medications   = prescriptions.flatMap(p => p.medications || []);

        await PatientHistory.findOneAndUpdate(
          { sessionId },
          {
            patientId:   session.patientId,
            sessionId,
            doctorId:    session.doctorId,
            date:        session.startedAt || new Date(),
            duration:    session.duration,
            notes:       sessionNotes || session.sessionNotes || '',
            medications,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (histErr) {
        console.error('PatientHistory auto-save failed:', histErr.message);
      }

      try {
        const Appointment = require('../models/appointment');
        await Appointment.findOneAndUpdate(
          { patientId: session.patientId, doctorId: session.doctorId, status: 'ongoing' },
          { status: 'completed' },
          { sort: { date: 1 } }
        );
      } catch (apptErr) {
        console.error('Appointment status update failed:', apptErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      data: { sessionId, duration: session.duration, endedAt: session.endedAt },
    });
  } catch (error) {
    console.error('endCall error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// PATCH /api/video/save-notes/:sessionId
exports.saveNotes = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { notes }     = req.body;

    if (typeof notes !== 'string') {
      return res.status(400).json({ success: false, message: 'notes must be a string.' });
    }

    const session = await VideoSession.findOneAndUpdate(
      { sessionId },
      { sessionNotes: notes },
      { new: true }
    );
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    if (session.patientId) {
      await PatientHistory.findOneAndUpdate({ sessionId }, { notes }).catch(() => {});
    }

    return res.status(200).json({ success: true, data: { sessionId, notes: session.sessionNotes } });
  } catch (error) {
    console.error('saveNotes error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// GET /api/video/call-info/:sessionId
exports.getCallInfo = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await VideoSession.findOne({ sessionId });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    const appId        = parseInt(process.env.ZEGO_APP_ID);
    const serverSecret = process.env.ZEGO_SERVER_SECRET;
    const doctorId     = req.user?.id   || session.doctorId || 'doctor';
    const doctorName   = req.user?.name || 'Doctor';
    const userId       = `doctor_${doctorId}`;
    const token        = generateToken04(appId, userId, serverSecret, 3600);

    let patientName = null;
    if (session.patientId) {
      try {
        const patient = await User.findById(session.patientId, 'name');
        patientName   = patient?.name || null;
      } catch { /* non-blocking */ }
    }

    return res.status(200).json({
      success: true,
      data: {
        ...buildCallData(session, token, userId, doctorName),
        status:        session.status,
        duration:      session.duration,
        sessionNotes:  session.sessionNotes,
        patientJoined: session.status === 'active' && !!session.patientId,
        patientId:     session.patientId || null,
        patientName,
      },
    });
  } catch (error) {
    console.error('getCallInfo error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// GET /api/video/summary/:sessionId
exports.getSessionSummary = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const [session, prescriptions] = await Promise.all([
      VideoSession.findOne({ sessionId }),
      Prescription.find({ sessionId }).sort({ issuedAt: -1 }),
    ]);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    let patientName = null;
    if (session.patientId) {
      try {
        const patient = await User.findById(session.patientId, 'name');
        patientName   = patient?.name || null;
      } catch { /* non-blocking */ }
    }

    return res.status(200).json({
      success: true,
      data: {
        sessionId,
        status:      session.status,
        notes:       session.sessionNotes || '',
        duration:    session.duration,
        startedAt:   session.startedAt,
        endedAt:     session.endedAt,
        patientId:   session.patientId,
        patientName,
        doctorId:    session.doctorId,
        prescriptions: prescriptions.map(p => ({
          id:          p._id,
          medications: p.medications,
          notes:       p.notes,
          issuedAt:    p.issuedAt,
        })),
      },
    });
  } catch (error) {
    console.error('getSessionSummary error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// POST /api/prescriptions
exports.issuePrescription = async (req, res) => {
  try {
    const { sessionId, medications, notes } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId is required.' });
    if (!Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({ success: false, message: 'medications array is required.' });
    }

    const doctorId  = req.user?.id || 'doctor';
    const session   = await VideoSession.findOne({ sessionId });
    const patientId = session?.patientId || null;

    const prescription = await Prescription.create({
      sessionId,
      doctorId,
      patientId,
      medications,
      notes:    notes || '',
      issuedAt: new Date(),
    });

    if (patientId) {
      try {
        const allRx   = await Prescription.find({ sessionId });
        const allMeds = allRx.flatMap(p => p.medications || []);
        allMeds.push(...medications);
        await PatientHistory.findOneAndUpdate(
          { sessionId },
          { medications: allMeds },
          { new: true }
        );
      } catch { /* non-blocking */ }
    }

    return res.status(201).json({ success: true, data: prescription });
  } catch (error) {
    console.error('issuePrescription error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// GET /api/prescriptions/:sessionId
exports.getPrescriptions = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const prescriptions = await Prescription.find({ sessionId }).sort({ issuedAt: -1 });
    return res.status(200).json({ success: true, data: prescriptions });
  } catch (error) {
    console.error('getPrescriptions error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// POST /api/video/get-token (legacy)
exports.getVideoToken = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required.' });
    const appId        = parseInt(process.env.ZEGO_APP_ID);
    const serverSecret = process.env.ZEGO_SERVER_SECRET;
    const token        = generateToken04(appId, userId, serverSecret, 3600);
    return res.status(200).json({ success: true, data: { token } });
  } catch (error) {
    console.error('getVideoToken error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};