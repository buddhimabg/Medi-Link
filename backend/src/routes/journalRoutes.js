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

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/')),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage: storage });

router.get('/', getJournals);
router.get('/:id', getJournalById);
router.post('/', upload.single('file'), createJournal);
router.put('/:id', updateJournal);
router.delete('/:id', deleteJournal);

module.exports = router;