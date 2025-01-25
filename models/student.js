// models/student.js
const mongoose = require('mongoose');

// Define the schema for the "students" collection
const studentSchema = new mongoose.Schema({
    number: {
        type: String,    // Student number
        required: true   // Required field
    },
    name: {
        type: String,    // Student name
        required: true   // Required field
    },
    sem: {
        type: Number,    // Semester
        required: true   // Required field
    },
    department: {
        type: String,    // Department
        enum: ["CSE", "IT", "APM", "TT"], // Allowed values for department
        required: true   // Required field
    },
    roll: {
        type: String,    // Roll number
        required: true,  // Required field
        unique: true     // Ensures roll number is unique
    },
    iscr: {
        type: Boolean,   // Is CR (Class Representative)
        default: false,  // Default value set to false
        required: true   // Required field
    },
    isVerified: {
        type: Boolean,
        default: false
    }
});

// Create and export the model
const Student = mongoose.model('Student', studentSchema);
module.exports = Student;
