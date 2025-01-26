const mongoose = require('mongoose');
const moment = require('moment');

// Define the schema for the "submissions" collection
const submissionSchema = new mongoose.Schema({
    faculty_number: {
        type: String,    // Faculty number (unique identifier for faculty)
        required: true   // Required field
    },
    subject_name: {
        type: String,    // Subject name
        required: true   // Required field
    },
    semester: {
        type: Number,    // Semester (1 to 8)
        min: 1,          // Minimum semester value
        max: 8,          // Maximum semester value
        required: true   // Required field
    },
    department: {
        type: String,    // Department (CSE, IT, APM, TT)
        enum: ["CSE", "IT", "APM", "TT"], // Allowed values for department
        required: true   // Required field
    },
    submission_date: {
        type: Date,      // Date when the submission was made
        default: moment(), // Default to current date and time
        required: true   // Required field
    },
    student_roll: {
        type: String,    // Student roll number (unique identifier for student)
        required: true   // Required field
    },
    file_path: {
        type: String,
        required: true
    }
});

// Create and export the model for "Submission" collection
const Submission = mongoose.model('Submission', submissionSchema);

// Export the Submission model for use in other parts of the application
module.exports = Submission;
