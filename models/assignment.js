const mongoose = require('mongoose');
const moment = require('moment');

// Define the schema for the "assignments" collection
const assignmentSchema = new mongoose.Schema({
    semester: {
        type: Number,    // Semester
        min: 1,          // Minimum semester value
        max: 8,          // Maximum semester value
        required: true   // Required field
    },
    faculty_number: {
        type: String,    // Faculty number
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
        type: Date,
        default: moment(),
        required: true
    },
    folder_path: {
        type: String,    // Path where the assignment files are stored
        required: true   // Required field
    },
    optional_msg: {
        type: String,    // Optional message
        required: false  // Not required field
    },
    // every single assignment is intended for many students, so submission holds number of submissions
    // submissions: {
    //     type: Number,
    //     default: 0
    // },
    deadline: {
        type: Date,
        default: moment().add(7, 'days').endOf('day'),  // Default to today's date
        required: true
    }
});

// Create and export the model
const Assignment = mongoose.model('Assignment', assignmentSchema);
module.exports = Assignment;

