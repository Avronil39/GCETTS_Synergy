// models/faculty.js
const mongoose = require('mongoose');

// Define the schema for the "faculty" collection
const facultySchema = new mongoose.Schema({
  number: {
    type: String,    // Faculty number
    required: true   // Required field
  },
  name: {
    type: String,    // Faculty name
    required: true   // Required field
  },
  department: {
    type: String,    // Department
    enum: ["CSE", "IT", "APM", "TT"], // Allowed values for department
    required: true   // Required field
  },
  ishod: {
    type: Boolean,   // Is head of department
    default: false,  // Default value set to false
    required: true   // Required field
  }
});

// Create and export the model
const Faculty = mongoose.model('Faculty', facultySchema);
module.exports = Faculty;
