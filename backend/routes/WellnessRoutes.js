// backend/routes/wellnessRoutes.js
const express = require('express');
const router = express.Router();
const WellnessCategory = require('../models/WellnessCategory');

// @route   GET /api/wellness/categories
// @desc    Get all wellness categories
router.get('/categories', async (req, res) => {
  try {
    // Fetches all categories from the database
    const categories = await WellnessCategory.find();
    res.json(categories);
  } catch (error) {
    console.error("Error fetching wellness categories:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;