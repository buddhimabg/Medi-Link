// backend/models/WellnessCategory.js
const mongoose = require('mongoose');

const wellnessCategorySchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  icon: { 
    type: String, 
    required: true 
  }, // We can store the emoji or a path to an image asset here
  bgColor: { 
    type: String, 
    required: true 
  }, // Background color for the icon circle
  exploreColor: { 
    type: String, 
    required: true 
  }, // Color for the "Explore ->" text
  linkPath: { 
    type: String, 
    required: true 
  } // Where the button takes the user (e.g., '/wellness/mindfulness')
});

module.exports = mongoose.model('WellnessCategory', wellnessCategorySchema);