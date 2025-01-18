const mongoose = require('mongoose');

// Define the schema for the "assignments" collection
const assignmentSchema = new mongoose.Schema({
    semester: {
        type: Number,    // Semester
        min: 1,          // Minimum semester value
        max: 8,          // Maximum semester value
        required: true   // Required field
    },
    given_by: {
        type: String,    // Faculty name 
        required: true   // Required field
    },
    department: {
        type: String,    // Department (CSE, IT, APM, TT)
        enum: ["CSE", "IT", "APM", "TT"], // Allowed values for department
        required: true   // Required field
    },
    subject_name: {
        type: String,    // Subject name
        required: true   // Required field
    },
    upload_date: {
        type: String,
        default: () => new Date().toISOString().split('T')[0]
    },
    folder_path: {
        type: String,    // Path where the assignment files are stored
        required: true   // Required field
    },
    optional_msg: {
        type: String,    // Optional message
        required: false  // Not required field
    }
});

// Create and export the model
const Assignment = mongoose.model('Assignment', assignmentSchema);
module.exports = Assignment;
