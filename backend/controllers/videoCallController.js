// src/controllers/videoCallController.js
const mongoose        = require('mongoose');
const crypto         = require('crypto');
const VideoSession   = require('../models/VideoSession');
const Prescription   = require('../models/Prescription');
const PatientHistory = require('../models/PatientHistory');
const User           = require('../models/user');
const Doctor         = require('../models/doctor');
const CallRecording  = require('../models/CallRecording');
const CallTranscript = require('../models/CallTranscript');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// ── Recording file upload (browser-captured tab recording) ─────────────────
// FIX: this file physically lives at backend/controllers/videoCallController.js
// (no intermediate "src" folder despite the header comment above), so
// __dirname = ".../backend/controllers". The old '../../uploads/recordings'
// therefore resolved to ".../uploads/recordings" ONE LEVEL ABOVE the backend
// folder entirely — outside where server.js's static middleware
// (express.static(path.resolve("uploads")), resolved relative to backend/
// since that's the cwd when running `node server.js`) actually serves from.
// Recordings were uploading "successfully" but landing in a folder nobody
// serves, so every download 404'd. One '../' — not two — lands correctly
// in backend/uploads/recordings.
const recordingsDir = path.join(__dirname, '../uploads/recordings');
if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir, { recursive: true });

const recordingStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, recordingsDir),
  filename: (req, file, cb) => {
    const sessionId = req.params.sessionId || 'session';
    cb(null, `${sessionId}-${Date.now()}.webm`);
  },
});
exports.uploadRecordingMiddleware = multer({ storage: recordingStorage }).single('recording');
const generateToken04 = (appId, userId, serverSecret, effectiveTimeInSeconds, payload = '') => {
  if (!appId || !userId || !serverSecret) return '';

  const createTime = Math.floor(Date.now() / 1000);
  const expire     = createTime + effectiveTimeInSeconds;
  const tokenInfo  = {
    app_id:  appId,
    user_id: userId,
    nonce:   Math.floor(Math.random() * 2147483647),
    ctime:   createTime,
    expire,
    payload,
  };
  const plaintext = JSON.stringify(tokenInfo);

  // Encrypt with AES-256-CBC using the full 32-byte ServerSecret as the key
  const iv         = crypto.randomBytes(16);
  const key        = Buffer.from(serverSecret, 'utf8');
  const cipher     = crypto.createCipheriv('aes-256-cbc', key, iv);
  cipher.setAutoPadding(true);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  // Pack per ZegoCloud's Token04 binary spec:
  // expire_time(8 bytes BE) + iv.length(2 bytes BE) + iv + ciphertext.length(2 bytes BE) + ciphertext
  const expireBuf     = Buffer.alloc(8);
  expireBuf.writeBigInt64BE(BigInt(expire));

  const ivLenBuf     = Buffer.alloc(2);
  ivLenBuf.writeUInt16BE(iv.length);

  const cipherLenBuf = Buffer.alloc(2);
  cipherLenBuf.writeUInt16BE(ciphertext.length);

  const buf = Buffer.concat([expireBuf, ivLenBuf, iv, cipherLenBuf, ciphertext]);
  return '04' + buf.toString('base64');
};
const buildCallData = (session, token, userId, userName) => ({
  roomId:    session.roomId,
  token,
  appId:     parseInt(process.env.ZEGO_APP_ID) || 0,
  userId,
  userName,
  sessionId: session.sessionId,
});

// The Zego sessionId/roomId is a PERMANENT per-doctor room, reused for
// every patient round. To keep each round's PatientHistory/Prescription
// records separate, every round gets its own unique key.
const makeRoundId = (sessionId, patientId) =>
  `${sessionId}_r${Date.now().toString(36)}${patientId ? '_' + patientId.slice(-6) : ''}`;

// Resolves the correct DB key for "this round"'s records — falls back to
// the raw sessionId for legacy/seeded sessions that predate this fix.
const resolveRoundKey = (session) => session.currentRoundId || session.sessionId;

// ── ZegoCloud Cloud Recording (Server REST API) ─────────────────────────────
// NOTE: verify field names / endpoint against your ZegoCloud console →
// Server APIs → Cloud Recording docs before going live — Zego occasionally
// tweaks response shapes (TaskId / FileList / State) between API versions.
const zegoRecordingSignature = () => {
  const appId     = process.env.ZEGO_APP_ID;
  const secret    = process.env.ZEGO_SERVER_SECRET;
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce     = crypto.randomBytes(8).toString('hex');
  const signStr   = `${appId}${secret}${nonce}${timestamp}`;
  const signature = crypto.createHash('md5').update(signStr).digest('hex');
  return { appId, timestamp, nonce, signature };
};

// Starts ZegoCloud's cloud recording for the room and logs a CallRecording
// doc keyed by this round's roundKey, so it can later be linked to the
// correct PatientHistory entry (rooms are reused across many patients).
const startZegoCloudRecording = async (session) => {
  const roundKey = session.currentRoundId || session.sessionId;

  const recording = await CallRecording.create({
    sessionId: session.sessionId,
    roundKey,
    patientId: session.patientId,
    doctorId:  session.doctorId,
    doctorConsent:  true,
    patientConsent: true,
    status: 'recording',
  });

  try {
    const { appId, timestamp, nonce, signature } = zegoRecordingSignature();
    const url = `https://cloudrecord-api.zego.im/?Action=StartRecord&AppId=${appId}&SignatureNonce=${nonce}&Timestamp=${timestamp}&Signature=${signature}&SignatureVersion=2.0`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        RoomId: session.roomId,
        InputParams: { RecordType: 1 }, // mix all streams into a single file
        OutputParams: { OutputTarget: 3, OutputFileFormat: [{ Format: 'mp4' }] },
      }),
    });
    const data = await resp.json();
    recording.taskId = data?.TaskId || '';
    await recording.save();
    console.log(`[recording] ▶️ started — session=${session.sessionId} taskId=${recording.taskId}`);
  } catch (err) {
    recording.status = 'failed';
    await recording.save();
    console.error('[recording] ❌ Zego StartRecord failed:', err.message);
  }
  return recording;
};

// Stops the active cloud recording for this round (called from endCall).
const stopZegoCloudRecording = async (session) => {
  const roundKey = session.currentRoundId || session.sessionId;
  const recording = await CallRecording.findOne({ roundKey, status: 'recording' }).sort({ createdAt: -1 });
  if (!recording) return null;

  try {
    const { appId, timestamp, nonce, signature } = zegoRecordingSignature();
    const url = `https://cloudrecord-api.zego.im/?Action=StopRecord&AppId=${appId}&SignatureNonce=${nonce}&Timestamp=${timestamp}&Signature=${signature}&SignatureVersion=2.0`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ TaskId: recording.taskId, RoomId: session.roomId }),
    });
  } catch (err) {
    console.error('[recording] ❌ Zego StopRecord failed:', err.message);
  }

  recording.status  = 'processing';   // Zego is still encoding/uploading the file
  recording.endedAt = new Date();
  await recording.save();
  console.log(`[recording] ⏹ stopped, processing — roundKey=${roundKey}`);
  return recording;
};

// ── ZegoCloud Real-time Cloud ASR (Server REST API) ─────────────────────────
// STATUS (Aug 2026): Cloud ASR is a sales-gated add-on on ZegoCloud — the
// console only offers "Talk to Sales" for it, it's not a self-serve toggle.
// See: https://www.zegocloud.com/blog/cloud-automatic-speech-recognition-asr
//
// Until it's actually enabled on this project's ZegoCloud account:
//   - ZEGO_ASR_ENABLED=false  → the real API calls below are skipped entirely.
//   - ZEGO_ASR_MOCK=true      → endCall still produces ONE placeholder
//     transcript chunk (clearly labelled MOCK) so the rest of the pipeline
//     — compile → append to sessionNotes → save to PatientHistory → display
//     on PatientHistoryPage — can be built and demoed right now.
//
// Once ZegoCloud approves the add-on: set ZEGO_ASR_ENABLED=true and
// double-check the Action name / endpoint / response field names below
// against the console docs (they are NOT verified against a live account —
// same caveat as the Cloud Recording block above).
const ASR_ENABLED = process.env.ZEGO_ASR_ENABLED === 'true';
const ASR_MOCK     = process.env.ZEGO_ASR_MOCK === 'true';

// Starts an ASR task for the room and logs a CallTranscript doc keyed by
// this round's roundKey. Mirrors startZegoCloudRecording's pattern.
const startZegoCloudASR = async (session) => {
  const roundKey = session.currentRoundId || session.sessionId;

  const transcriptDoc = await CallTranscript.create({
    sessionId: session.sessionId,
    roundKey,
    patientId: session.patientId,
    doctorId:  session.doctorId,
    status: ASR_ENABLED ? 'listening' : (ASR_MOCK ? 'mock' : 'disabled'),
    chunks: [],
  });

  if (!ASR_ENABLED) {
    console.log(`[asr] ⏭️  Cloud ASR disabled (ZEGO_ASR_ENABLED=false) — roundKey=${roundKey}${ASR_MOCK ? ' — mock mode on, endCall will generate a placeholder' : ''}`);
    return transcriptDoc;
  }

  try {
    const { appId, timestamp, nonce, signature } = zegoRecordingSignature();
    // ⚠️ UNVERIFIED — confirm Action name + request/response shape against
    // ZegoCloud console → Server APIs → Cloud ASR once the add-on is live.
    const url = `https://aigc-aiagent-api.zego.im/?Action=StartASRTask&AppId=${appId}&SignatureNonce=${nonce}&Timestamp=${timestamp}&Signature=${signature}&SignatureVersion=2.0`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        RoomId: session.roomId,
        CallbackUrl: `${process.env.SERVER_BASE_URL || ''}/api/video/zego-asr-callback`,
      }),
    });
    const data = await resp.json();
    transcriptDoc.taskId = data?.TaskId || '';
    await transcriptDoc.save();
    console.log(`[asr] ▶️ started — session=${session.sessionId} taskId=${transcriptDoc.taskId}`);
  } catch (err) {
    transcriptDoc.status = 'failed';
    await transcriptDoc.save();
    console.error('[asr] ❌ Zego StartASR failed:', err.message);
  }
  return transcriptDoc;
};

// Stops the active ASR task for this round and compiles whatever chunks
// arrived (via zegoAsrCallback) into a single plain-text transcript.
// Returns '' if there's nothing to save.
const stopZegoCloudASR = async (session) => {
  const roundKey = session.currentRoundId || session.sessionId;
  let transcriptDoc = await CallTranscript.findOne({ roundKey }).sort({ createdAt: -1 });

  // FIX: previously if startZegoCloudASR never ran for this round (e.g. the
  // consent gate blocked it, or endCall races ahead of the async start call),
  // no CallTranscript doc existed and this returned '' immediately — silently
  // dropping the transcript feature for that round. Create it here instead so
  // stopZegoCloudASR always has a doc to work with and the mock-fallback
  // block below still has a chance to run.
  if (!transcriptDoc) {
    console.warn(`[asr] ⚠️  no CallTranscript doc found at stop time — creating one now (roundKey=${roundKey})`);
    transcriptDoc = await CallTranscript.create({
      sessionId: session.sessionId,
      roundKey,
      patientId: session.patientId,
      doctorId:  session.doctorId,
      status: ASR_ENABLED ? 'listening' : (ASR_MOCK ? 'mock' : 'disabled'),
      chunks: [],
    });
  }

  if (ASR_ENABLED && transcriptDoc.taskId) {
    try {
      const { appId, timestamp, nonce, signature } = zegoRecordingSignature();
      // ⚠️ UNVERIFIED — same caveat as StartASRTask above.
      const url = `https://aigc-aiagent-api.zego.im/?Action=StopASRTask&AppId=${appId}&SignatureNonce=${nonce}&Timestamp=${timestamp}&Signature=${signature}&SignatureVersion=2.0`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ TaskId: transcriptDoc.taskId, RoomId: session.roomId }),
      });
    } catch (err) {
      console.error('[asr] ❌ Zego StopASR failed:', err.message);
    }
  }

  // Mock mode fallback — only kicks in if ASR is disabled AND no real
  // chunks ever arrived. Remove this block once ZEGO_ASR_ENABLED=true.
  if (!ASR_ENABLED && ASR_MOCK && transcriptDoc.chunks.length === 0) {
    transcriptDoc.chunks = [{
      speaker: 'system',
      text: '[MOCK TRANSCRIPT — ZegoCloud Cloud ASR is not yet enabled on this account. Real speech-to-text will appear here automatically once the add-on is approved and ZEGO_ASR_ENABLED=true.]',
      timestamp: new Date(),
    }];
  }

  transcriptDoc.status  = 'completed';
  transcriptDoc.endedAt = new Date();
  await transcriptDoc.save();

  if (transcriptDoc.chunks.length === 0) return '';

  const transcriptText = transcriptDoc.chunks
    .map(c => `[${new Date(c.timestamp).toLocaleTimeString()}] ${c.speaker}: ${c.text}`)
    .join('\n');

  console.log(`[asr] ⏹ stopped — roundKey=${roundKey} chunks=${transcriptDoc.chunks.length}`);
  return transcriptText;
};

// Appends transcript text into session.sessionNotes using the same
// "--- Session Transcript ---" marker that PatientHistoryPage.tsx already
// splits on to render Notes and Transcript as separate cards. Shared by
// endCall's automatic ASR save and the manual saveTranscript endpoint.
const appendTranscriptToSession = async (session, transcriptText) => {
  if (!transcriptText) return;
  const tagged = `\n\n--- Session Transcript ---\n${transcriptText}`;
  session.sessionNotes = (session.sessionNotes || '') + tagged;
  await session.save();
};

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
    const { sessionId, patientId } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId is required.' });

    // TEMP: no consent UI exists yet, so we auto-grant doctor consent here.
    // Remove this line once a real consent step is built and pass the
    // actual value through from req.body instead.
    const doctorConsent = true;

    const appId        = parseInt(process.env.ZEGO_APP_ID) || 0;
    const serverSecret = process.env.ZEGO_SERVER_SECRET;
    const doctorId     = req.user?.id   || 'doctor';
    const doctorName   = req.user?.name || 'Doctor';
    const userId       = `doctor_${doctorId}`;

    let session = await VideoSession.findOne({ sessionId });
    if (!session) {
      session = await VideoSession.create({
        sessionId,
        doctorId,
        patientId:      patientId || null,
        currentRoundId: patientId ? makeRoundId(sessionId, patientId) : null,
        roomId:       sessionId,
        status:       'waiting',
        doctorConsent: !!doctorConsent,
        callMetadata: {
          appId,
          doctorUserId:  userId,
          patientUserId: patientId ? `patient_${patientId}` : '',
        },
      });
    } else if (session.status === 'ended' || session.status === 'cancelled') {
      // Re-using a room for a fresh round — attach whichever patient is
      // now first in queue (passed in from the frontend) and mint a new
      // round key so this round's records don't collide with the last one.
      session.status         = 'waiting';
      session.endedAt        = null;
      session.startedAt      = null;
      session.duration       = 0;
      session.patientId      = patientId || null;
      session.currentRoundId = patientId ? makeRoundId(sessionId, patientId) : null;
      session.doctorConsent  = doctorConsent; // TEMP: always true, see above
      session.patientConsent = false;
      session.callMetadata.patientUserId = patientId ? `patient_${patientId}` : '';
      await session.save();
    } else if (patientId && session.patientId !== patientId) {
      // Session already exists (waiting/active) but no patient attached yet,
      // OR the queue's first patient changed since the room was created
      // (e.g. the doctor is testing solo without a separate patient login) —
      // attach/refresh the round key so endCall saves under the right patient.
      session.patientId      = patientId;
      session.currentRoundId = makeRoundId(sessionId, patientId);
      session.callMetadata.patientUserId = `patient_${patientId}`;
      await session.save();
    }

    const token    = generateToken04(appId, userId, serverSecret, 3600);
    const callData = buildCallData(session, token, userId, doctorName);
    console.log(`Room created — session: ${sessionId}, doctor: ${doctorId}, patient: ${session.patientId || '(none yet)'}`);
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

    // TEMP: no consent UI exists yet, so we auto-grant patient consent here.
    // Remove this line once a real consent step is built and pass the
    // actual value through from req.body instead.
    const patientConsent = true;

    const session = await VideoSession.findOne({ sessionId });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    if (session.status === 'ended' || session.status === 'cancelled') {
      return res.status(400).json({ success: false, message: `Session is already ${session.status}.` });
    }

    const appId        = parseInt(process.env.ZEGO_APP_ID) || 0;
    const serverSecret = process.env.ZEGO_SERVER_SECRET;
    const patientId    = req.user?.id   || 'patient';
    const patientName  = req.user?.name || 'Patient';
    const userId       = `patient_${patientId}`;

    const isNewPatientForThisRound = session.patientId !== patientId;
    session.patientId                    = patientId;
    session.status                       = 'active';
    session.startedAt                    = session.startedAt || new Date();
    // If the doctor hasn't already attached a round key for this patient
    // (e.g. solo testing flow already set it via createRoom), mint one now.
    if (!session.currentRoundId || isNewPatientForThisRound) {
      session.currentRoundId = makeRoundId(sessionId, patientId);
    }
    session.callMetadata.patientUserId = userId;
    session.patientConsent = patientConsent; // TEMP: always true, see above
    await session.save();

    // Both parties consented → start cloud recording + ASR for this round
    if (session.doctorConsent && session.patientConsent) {
      startZegoCloudRecording(session).catch(err =>
        console.error('[recording] failed to start:', err.message)
      );
      startZegoCloudASR(session).catch(err =>
        console.error('[asr] failed to start:', err.message)
      );
    }

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

    console.log(`[endCall] session=${sessionId} patientId=${session.patientId || '(none — history/queue will NOT update!)'} roundKey=${session.currentRoundId || '(none, using raw sessionId)'}`);

    if (session.patientId) {
      const roundKey = resolveRoundKey(session);
      const cloudRecording = await stopZegoCloudRecording(session);

      // Stop ASR, compile whatever was captured, and append it into
      // session.sessionNotes (using the same marker PatientHistoryPage
      // already parses) BEFORE we read session.sessionNotes below.
      try {
        const transcriptText = await stopZegoCloudASR(session);
        await appendTranscriptToSession(session, transcriptText);
        if (transcriptText) {
          console.log(`[endCall] ✅ transcript appended — roundKey=${roundKey} length=${transcriptText.length}`);
        }
      } catch (asrErr) {
        console.error('[endCall] ❌ ASR stop/compile failed:', asrErr.message);
      }

      try {
        const prescriptions = await Prescription.find({ sessionId: roundKey }).sort({ issuedAt: -1 });
        const medications   = prescriptions.flatMap(p => p.medications || []);

        // FIX: don't blindly overwrite recordingStatus/recordingUrl with the
        // ZegoCloud cloud-recording result. If cloud recording never started
        // (add-on disabled on the ZegoCloud account), stopZegoCloudRecording
        // returns null — but a browser-captured recording may already have
        // been uploaded and saved via uploadRecording() during the call.
        // Check the DB for the latest actual recording state for this round
        // before deciding what to write, so we never stomp on good data.
        const existingHistory = await PatientHistory.findOne({ sessionId: roundKey });
        const finalRecordingStatus =
          cloudRecording?.status ||
          existingHistory?.recordingStatus ||
          'none';
        const finalRecordingUrl =
          cloudRecording?.recordingUrl ||
          existingHistory?.recordingUrl ||
          '';

        await PatientHistory.findOneAndUpdate(
          { sessionId: roundKey },
          {
            patientId:      session.patientId,
            sessionId:      roundKey,
            doctorId:       session.doctorId,
            date:           session.startedAt || new Date(),
            duration:       session.duration,
            // session.sessionNotes already includes the doctor's notes AND
            // the freshly-appended ASR transcript (see appendTranscriptToSession above).
            notes:          session.sessionNotes || '',
            notesForPatient: prescriptions[0]?.notes || '',
            medications,
            recordingStatus: finalRecordingStatus,
            recordingUrl:    finalRecordingUrl,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log(`[endCall] ✅ PatientHistory saved for patient=${session.patientId} (${medications.length} meds)`);
      } catch (histErr) {
        console.error('[endCall] ❌ PatientHistory auto-save failed:', histErr.message);
      }

      try {
        const Appointment = require('../models/appointment');

        // FIX 1: appointment.js schema defaults status to 'pending' and
        // nothing in createRoom/joinRoom ever transitions it to 'ongoing'
        // — matching on status:'ongoing' here never hit, so the appointment
        // (and therefore the doctor's queue) never updated. Match any
        // not-already-finished status instead ('pending' or 'ongoing').
        //
        // FIX 2 (root cause): session.doctorId is the logged-in User._id,
        // but Appointment.doctorId stores the Doctor._id (a separate
        // document) — two different collections with different _id
        // values, not just a type mismatch. Resolve User._id ->
        // Doctor._id via Doctor.userId first, same pattern used in
        // appointmentController.js's getDoctorQueue/getDoctorQueueEnriched.
        const doctorProfile = session.doctorId
          ? await Doctor.findOne({ userId: String(session.doctorId) })
          : null;
        const resolvedDoctorId = doctorProfile ? doctorProfile._id.toString() : String(session.doctorId || '');

        // FIX 3: Appointment.doctorId is schema type Mixed, so it may be
        // stored as either a plain String or a real BSON ObjectId depending
        // on how the appointment was created — match both stored forms.
        const doctorIdVariants = [resolvedDoctorId];
        if (mongoose.Types.ObjectId.isValid(resolvedDoctorId)) {
          doctorIdVariants.push(new mongoose.Types.ObjectId(resolvedDoctorId));
        }

        const updatedAppt = await Appointment.findOneAndUpdate(
          { patientId: session.patientId, doctorId: { $in: doctorIdVariants }, status: { $nin: ['completed', 'cancelled'] } },
          { status: 'completed' },
          { sort: { date: 1 } }
        );
        if (updatedAppt) {
          console.log(`[endCall] ✅ Appointment ${updatedAppt._id} marked completed (was ${updatedAppt.status}) — patient will drop off the queue.`);
        } else {
          console.warn(`[endCall] ⚠️  No pending/ongoing appointment found for patientId=${session.patientId} doctorId=${resolvedDoctorId} — queue will NOT update! Check that these IDs match an Appointment doc in MongoDB.`);
        }
      } catch (apptErr) {
        console.error('[endCall] ❌ Appointment status update failed:', apptErr.message);
      }
    } else {
      console.warn('[endCall] ⚠️  session.patientId is empty — no patient was ever attached to this room this round. History/queue will not update. (Was createRoom called with a patientId, or did a real patient join via joinRoom?)');
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
      const roundKey = resolveRoundKey(session);
      await PatientHistory.findOneAndUpdate({ sessionId: roundKey }, { notes }).catch(() => {});
    }

    return res.status(200).json({ success: true, data: { sessionId, notes: session.sessionNotes } });
  } catch (error) {
    console.error('saveNotes error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// GET /api/video/call-info/:sessionId
exports.getCallInfo = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await VideoSession.findOne({ sessionId });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    const appId        = parseInt(process.env.ZEGO_APP_ID) || 0;
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

    const roundKey        = resolveRoundKey(session);
    const activeRecording = await CallRecording.findOne({ roundKey }).sort({ createdAt: -1 });

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
        recordingStatus: activeRecording?.status || 'none',
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
    const session = await VideoSession.findOne({ sessionId });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    const roundKey     = resolveRoundKey(session);
    const prescriptions = await Prescription.find({ sessionId: roundKey }).sort({ issuedAt: -1 });
    const medications    = prescriptions.flatMap(p => p.medications || []);
    // Latest prescription's "Notes for Patient" text (what the patient sees)
    const notesForPatient = prescriptions[0]?.notes || '';

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
        status:              session.status,
        sessionNotes:        session.sessionNotes || '',   // doctor's private observations
        notesForPatient,                                   // shown to the patient with the Rx
        duration:            session.duration,
        startedAt:           session.startedAt,
        endedAt:             session.endedAt,
        patientId:           session.patientId,
        patientName,
        doctorId:            session.doctorId,
        medications,                                       // flattened, ready to render
        prescriptionsIssued: prescriptions.length,
        rxSavedToDb:         prescriptions.length > 0,
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
    const roundKey  = session ? resolveRoundKey(session) : sessionId;

    const prescription = await Prescription.create({
      sessionId: roundKey,
      doctorId,
      patientId,
      medications,
      notes:    notes || '',
      issuedAt: new Date(),
    });

    if (patientId) {
      try {
        const allRx   = await Prescription.find({ sessionId: roundKey });
        const allMeds = allRx.flatMap(p => p.medications || []);
        allMeds.push(...medications);
        await PatientHistory.findOneAndUpdate(
          { sessionId: roundKey },
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
    const session   = await VideoSession.findOne({ sessionId });
    const roundKey  = session ? resolveRoundKey(session) : sessionId;
    const prescriptions = await Prescription.find({ sessionId: roundKey }).sort({ issuedAt: -1 });
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
    const appId        = parseInt(process.env.ZEGO_APP_ID) || 0;
    const serverSecret = process.env.ZEGO_SERVER_SECRET;
    const token        = generateToken04(appId, userId, serverSecret, 3600);
    return res.status(200).json({ success: true, data: { token } });
  } catch (error) {
    console.error('getVideoToken error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

// POST /api/video/zego-recording-callback   (no auth — called by ZegoCloud itself)
exports.zegoRecordingCallback = async (req, res) => {
  try {
    const { TaskId, FileList, State } = req.body;
    const recording = await CallRecording.findOne({ taskId: TaskId });
    if (!recording) return res.sendStatus(200);

    if (State === 'success' || State === 1) {
      recording.status       = 'completed';
      recording.recordingUrl = FileList?.[0]?.FileUrl || '';
      recording.duration     = FileList?.[0]?.Duration || recording.duration;
    } else {
      recording.status = 'failed';
    }
    await recording.save();

    // Sync into PatientHistory — this is what powers PatientHistoryPage's
    // download button, since by webhook time the file is actually ready.
    await PatientHistory.findOneAndUpdate(
      { sessionId: recording.roundKey },
      { recordingStatus: recording.status, recordingUrl: recording.recordingUrl }
    ).catch(() => {});

    console.log(`[recording] webhook — taskId=${TaskId} status=${recording.status}`);
    return res.sendStatus(200);
  } catch (error) {
    console.error('zegoRecordingCallback error:', error);
    return res.sendStatus(200); // always 200 so Zego doesn't endlessly retry
  }
};

// POST /api/video/zego-asr-callback   (no auth — called by ZegoCloud itself)
// Receives one recognized utterance at a time while ASR_ENABLED=true and
// pushes it onto that round's CallTranscript.chunks. endCall later compiles
// all chunks into the final transcript text via stopZegoCloudASR().
// ⚠️ Field names (TaskId/Text/Speaker/Timestamp) are UNVERIFIED — confirm
// the actual callback payload shape against ZegoCloud's Cloud ASR docs
// once the add-on is enabled and update this destructure accordingly.
exports.zegoAsrCallback = async (req, res) => {
  try {
    const { TaskId, Text, Speaker, Timestamp } = req.body;
    if (!Text) return res.sendStatus(200);

    const transcriptDoc = await CallTranscript.findOne({ taskId: TaskId });
    if (!transcriptDoc) return res.sendStatus(200);

    transcriptDoc.chunks.push({
      speaker:   Speaker || 'unknown',
      text:      Text,
      timestamp: Timestamp ? new Date(Timestamp) : new Date(),
    });
    await transcriptDoc.save();

    return res.sendStatus(200);
  } catch (error) {
    console.error('zegoAsrCallback error:', error);
    return res.sendStatus(200); // always 200 so Zego doesn't endlessly retry
  }
};

// GET /api/video/recording-status/:sessionId  — lightweight polling during a live call
exports.getRecordingStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await VideoSession.findOne({ sessionId });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    const roundKey  = resolveRoundKey(session);
    const recording = await CallRecording.findOne({ roundKey }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: { status: recording?.status || 'none' } });
  } catch (error) {
    console.error('getRecordingStatus error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// GET /api/video/recording/:roundKey  — fetch + access-control before download
// Only the doctor who ran the session or the patient it belongs to can access it.
exports.getRecording = async (req, res) => {
  try {
    const { roundKey } = req.params;
    const recording = await CallRecording.findOne({ roundKey });
    if (!recording) {
      return res.status(404).json({ success: false, message: 'No recording found for this session.' });
    }

    const userId    = req.user?.id;
    const isDoctor  = userId === recording.doctorId;
    const isPatient = userId === recording.patientId;
    if (!isDoctor && !isPatient) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this recording.' });
    }

    return res.status(200).json({ success: true, data: recording });
  } catch (error) {
    console.error('getRecording error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
// POST /api/video/upload-recording/:sessionId  — browser-captured recording upload
exports.uploadRecording = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!req.file) return res.status(400).json({ success: false, message: 'No recording file received.' });

    const session = await VideoSession.findOne({ sessionId });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    const roundKey     = resolveRoundKey(session);
    const recordingUrl = `/uploads/recordings/${req.file.filename}`;

    // Find (or create) this round's CallRecording doc and mark it completed
    let recording = await CallRecording.findOne({ roundKey }).sort({ createdAt: -1 });
    if (!recording) {
      recording = await CallRecording.create({
        sessionId: session.sessionId, roundKey,
        patientId: session.patientId, doctorId: session.doctorId,
        doctorConsent: true, patientConsent: true, status: 'completed',
      });
    }
    recording.status       = 'completed';
    recording.recordingUrl = recordingUrl;
    await recording.save();

    // Keep PatientHistory in sync so PatientHistoryPage's Download button works.
    // FIX: this used to run without upsert. If the call is still in progress
    // (recording uploads before endCall creates the PatientHistory record),
    // the update was a silent no-op and the recording status/url were lost.
    // upsert:true here creates a partial record now; endCall's later upsert
    // (which reads existingHistory.recordingStatus/recordingUrl as a
    // fallback) then merges the rest in without overwriting this.
    await PatientHistory.findOneAndUpdate(
      { sessionId: roundKey },
      {
        $set: { recordingStatus: 'completed', recordingUrl },
        $setOnInsert: {
          patientId: session.patientId,
          doctorId:  session.doctorId,
          date:      session.startedAt || new Date(),
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    ).catch(err => console.error('[recording] ⚠️ PatientHistory sync failed:', err.message));

    console.log(`[recording] ✅ uploaded — roundKey=${roundKey} file=${req.file.filename}`);
    return res.status(200).json({ success: true, data: { recordingUrl } });
  } catch (error) {
    console.error('uploadRecording error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// PATCH /api/video/save-transcript/:sessionId — manual/live transcript, appended into sessionNotes
exports.saveTranscript = async (req, res) => {
  try {
    const { sessionId }  = req.params;
    const { transcript } = req.body;
    if (typeof transcript !== 'string') {
      return res.status(400).json({ success: false, message: 'transcript must be a string.' });
    }

    const session = await VideoSession.findOne({ sessionId });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    const roundKey = resolveRoundKey(session);
    await appendTranscriptToSession(session, transcript);

    await PatientHistory.findOneAndUpdate(
      { sessionId: roundKey },
      { $set: { notes: (session.sessionNotes || '') } }
    ).catch(() => {});

    console.log(`[transcript] ✅ saved — roundKey=${roundKey} length=${transcript.length}`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('saveTranscript error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};