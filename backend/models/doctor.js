const mongoose = require('mongoose');

 
const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  specialty: {
    type: String,
    required: false  
  },
  hospital: {
    type: String,
    required: false
  },
  imageUrl: {
    type: String,
    required: false  
  }
}, { 
  timestamps: true  
});

 
module.exports = mongoose.model('Doctor', doctorSchema);