const express = require('express');
const router = express.Router();
const { mongoose } = require('../db');

// Simple DB status endpoint - returns mongoose connection state
router.get('/db', (req, res) => {
    try {
        const state = mongoose.connection.readyState; // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
        res.json({ readyState: state });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
