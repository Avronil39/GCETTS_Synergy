const mongoose = require('mongoose');
const moment = require('moment');
// Define the schema for the "notice" collection
const noticeSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: moment(),  // Default to today's date
    required: true      // Notice date (Date)
  },
  sem: {
    type: Number,
    required: true      // Semester (Number)
  },
  department: {
    type: String,
    required: true      // Department (String)
  },
  info: {
    type: String,
    required: true      // Notice information (String)
  },
  updated_by: {
    type: String,
    required: true      // Who updated the notice (String)
  },
  link: {
    type: String,      // Optional link for the notice
    default: null      // Default to null if not provided
  }
});

// Create and export the model
const Notice = mongoose.model('Notice', noticeSchema);
module.exports = Notice;
