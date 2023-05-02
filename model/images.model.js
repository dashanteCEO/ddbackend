const mongoose = require('mongoose');

// Define the image schema
const imageSchema = new mongoose.Schema({
  brand: {
    type: String
  },
  model: {
    type: String,
    required: true
  },
  year: {
    type: String,
    required: true
  }, 
  seats: {
    type: String,
    required: true
  }, 
  mileage: {
    type: String,
    required: true
  }, 
  streeing: {
    type: String,
    required: true
  }, 
  transmission: {
    type: String,
    required: true
  }, 
  feul: {
    type: String,
    required: true
  }, 
  color: {
    type: String,
    required: true
  },
  bodyType: {
    type: String,
    required: true
  },
  specs: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create the image model
const Image = mongoose.model('Image', imageSchema);

module.exports = Image;
