// models/config.js
const mongoose = require('mongoose');

// Define the schema for the "config" collection
const configSchema = new mongoose.Schema({
  about: {
    type: String,  // Will store either "Student" or "Faculty"
    enum: ["STUDENT", "FACULTY"], // Restrict values to "Student" or "Faculty"
    required: true
  },
  add_person: {
    type: Boolean, // Boolean flag for adding a person
    default: false
  },
  delete_person: {
    type: Boolean, // Boolean flag for deleting a person
    default: false
  },
  add_notice: {
    type: Boolean, // Boolean flag for adding a notice
    default: false
  },
  delete_notice: {
    type: Boolean, // Boolean flag for deleting a notice
    default: false
  }
});

// Create and export the model
const Config = mongoose.model('Config', configSchema);
module.exports = Config;
