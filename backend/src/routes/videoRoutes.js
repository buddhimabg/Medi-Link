// src/routes/videoRoutes.js
const express          = require('express');
const router           = express.Router();
const ctrl             = require('../controllers/videoCallController');
const { protect, requireRole } = require('../middleware/auth');

// ── Video Session Routes ───────────────────────────────────────────────────

// POST   /api/video/get-token            — legacy token endpoint (no auth)
router.post('/get-token', ctrl.getVideoToken);

router.post('/invite/:sessionId', protect, requireRole('doctor'), ctrl.sendInvitation);

// POST   /api/video/create-room          — doctor creates a session room
router.post('/create-room', protect, requireRole('doctor'), ctrl.createRoom);

// POST   /api/video/join-room            — patient joins an existing room
router.post('/join-room', protect, ctrl.joinRoom);

// GET    /api/video/session-status/:sessionId  — lightweight polling (no auth)
// Used by WaitingRoom to detect when patient has joined.
router.get('/session-status/:sessionId', ctrl.getSessionStatus);

// PATCH  /api/video/end-call/:sessionId        — doctor ends the call
router.patch('/end-call/:sessionId', protect, requireRole('doctor'), ctrl.endCall);

// PATCH  /api/video/save-notes/:sessionId      — doctor saves session notes
router.patch('/save-notes/:sessionId', protect, requireRole('doctor'), ctrl.saveNotes);

// GET    /api/video/call-info/:sessionId        — get session details + fresh token
router.get('/call-info/:sessionId', protect, ctrl.getCallInfo);

// GET    /api/video/summary/:sessionId          — full session summary (notes + prescriptions)
router.get('/summary/:sessionId', protect, ctrl.getSessionSummary);

// ── Recording routes ────────────────────────────────────────────────────────
// POST   /api/video/zego-recording-callback    — Zego webhook (no auth)
router.post('/zego-recording-callback', ctrl.zegoRecordingCallback);

// GET    /api/video/recording-status/:sessionId — live polling during a call
router.get('/recording-status/:sessionId', protect, ctrl.getRecordingStatus);

// GET    /api/video/recording/:roundKey         — fetch recording for download
router.get('/recording/:roundKey', protect, ctrl.getRecording);

// POST   /api/video/upload-recording/:sessionId  — browser-captured recording upload
router.post('/upload-recording/:sessionId', protect, requireRole('doctor'), ctrl.uploadRecordingMiddleware, ctrl.uploadRecording);

// PATCH  /api/video/save-transcript/:sessionId    — live speech-to-text transcript
router.patch('/save-transcript/:sessionId', protect, requireRole('doctor'), ctrl.saveTranscript);

// videoRoutes.js eke, existing recording routes tika langama add karanna:
router.post('/upload-recording/:sessionId', protect, ctrl.uploadRecordingMiddleware, ctrl.uploadRecording);
router.patch('/save-transcript/:sessionId', protect, ctrl.saveTranscript);
module.exports = router;