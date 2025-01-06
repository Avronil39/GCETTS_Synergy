// models/faculty.js
const mongoose = require('mongoose');

// Define the schema for the "faculty" collection
const facultySchema = new mongoose.Schema({
  number: String,        // Faculty number (string)
  name: String,          // Faculty name (string)
  department: String,    // Department (string)
  ishod: Boolean         // Is head of department (boolean)
});

// Create and export the model
const Faculty = mongoose.model('Faculty', facultySchema);
module.exports = Faculty;
