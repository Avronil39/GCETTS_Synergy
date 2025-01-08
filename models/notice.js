// models/notice.js
const mongoose = require('mongoose');

// Define the schema for the "notice" collection
const noticeSchema = new mongoose.Schema({
  date: { 
    type: Date, 
    required: true  // Notice date (Date)
  },
  sem: { 
    type: Number, 
    required: true  // Semester (Number)
  },
  department: { 
    type: String, 
    required: true  // Department (String)
  },
  info: { 
    type: String, 
    required: true  // Notice information (String)
  },
  updated_by: { 
    type: String, 
    required: true  // Who updated the notice (String)
  }
});

// Create and export the model
const Notice = mongoose.model('Notice', noticeSchema);
module.exports = Notice;
