const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { 
  createJournal, 
  getJournals, 
  getJournalById, 
  updateJournal, 
  deleteJournal 
} = require('../controllers/journalController');
const { generateContent, suggestTopics } = require('../controllers/journalAiController');
const { protect, requireRole } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/')),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage: storage });

// සියල්ලටම login වෙලා ඉන්න one (doctor/patient දෙන්නටම), write actions doctor ට විතරයි
router.get('/', protect, getJournals);

// AI Writer routes (doctor විතරයි use කරන්නේ) — must come before '/:id'
router.post('/ai/generate', protect, requireRole('doctor'), generateContent);
router.post('/ai/topics', protect, requireRole('doctor'), suggestTopics);

router.get('/:id', protect, getJournalById);
router.post('/', protect, requireRole('doctor'), upload.single('file'), createJournal);
router.put('/:id', protect, requireRole('doctor'), updateJournal);
router.delete('/:id', protect, requireRole('doctor'), deleteJournal);

module.exports = router;
