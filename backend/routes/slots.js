const express = require('express');
const router = express.Router();
const WeeklySlot = require('../models/weeklySlot');

// ============================================
// GET SLOTS BY DATE - Auto converts date to day
// ============================================
router.get('/date/:date', async (req, res) => {
    try {
        const { date } = req.params;
        console.log('🔍 Fetching slots for date:', date);
        
        // Get day of week from date
        const dateObj = new Date(date);
        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const day = dayNames[dateObj.getDay()];
        
        console.log('📅 Day of week:', day);
        
        // Find slots for this day
        const slots = await WeeklySlot.find({ day: day }).sort({ id: 1 });
        console.log('✅ Found slots:', slots.length);
        
        // Add the date to each slot for frontend display
        const slotsWithDate = slots.map(slot => ({
            ...slot._doc,
            date: date
        }));
        
        res.json(slotsWithDate);
    } catch (error) {
        console.error('❌ Error fetching slots by date:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET TODAY'S SLOTS - Auto calculates today
// ============================================
router.get('/today', async (req, res) => {
    try {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const day = dayNames[today.getDay()];
        
        console.log('📅 Today:', dateStr, 'Day:', day);
        
        const slots = await WeeklySlot.find({ day: day }).sort({ id: 1 });
        const slotsWithDate = slots.map(slot => ({
            ...slot._doc,
            date: dateStr
        }));
        
        res.json(slotsWithDate);
    } catch (error) {
        console.error('❌ Error fetching today\'s slots:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET ALL SLOTS
// ============================================
router.get('/all', async (req, res) => {
    try {
        const slots = await WeeklySlot.find().sort({ id: 1 });
        console.log('✅ All slots:', slots.length);
        res.json(slots);
    } catch (error) {
        console.error('❌ Error fetching all slots:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET SLOTS BY DAY (MON, TUE, etc.)
// ============================================
router.get('/day/:day', async (req, res) => {
    try {
        const { day } = req.params;
        const slots = await WeeklySlot.find({ day: day }).sort({ id: 1 });
        res.json(slots);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// UPDATE SLOT
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const slotId = parseInt(req.params.id);
        const { status, totalPatients } = req.body;

        const slot = await WeeklySlot.findOneAndUpdate(
            { id: slotId },
            { $set: { status, totalPatients } },
            { new: true }
        );

        if (!slot) return res.status(404).json({ error: 'Slot not found' });
        res.json(slot);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// TEST ROUTE
// ============================================
router.get('/test', async (req, res) => {
    try {
        const slots = await WeeklySlot.find();
        res.json({ 
            count: slots.length, 
            slots: slots,
            message: 'Test route working!'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;