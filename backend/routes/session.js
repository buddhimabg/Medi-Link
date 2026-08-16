const express = require('express');
const router = express.Router();
const Session = require('../models/session');

// Get all sessions
router.get('/', async (req, res) => {
    try {
        const sessions = await Session.find().sort({ id: 1 });
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get session by numeric id
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        console.log('🔍 GET session by id:', id);
        const session = await Session.findOne({ id: id });
        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete session
router.delete('/:id', async (req, res) => {
    try {
        const rawId = req.params.id;
        console.log('🗑️ DELETE request for session id param:', rawId);
        const numericId = parseInt(rawId);
        let session = null;

        if (!isNaN(numericId)) {
            session = await Session.findOneAndDelete({ id: numericId });
            console.log('🗂️ Tried delete by numeric id:', numericId, 'result:', !!session);
        }

        // Fallback: try deleting by _id if numeric id didn't match
        if (!session) {
            const mongoose = require('mongoose');
            if (mongoose.isValidObjectId(rawId)) {
                session = await Session.findByIdAndDelete(rawId);
                console.log('🗂️ Tried delete by _id:', rawId, 'result:', !!session);
            }
        }

        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json({ success: true, message: 'Session cancelled successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;