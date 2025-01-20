// models/faculty.js
const mongoose = require('mongoose');
const moment = require('moment');

// Define the schema for the "faculty" collection
const bugReportSchema = new mongoose.Schema({
    // add reported by (number)
    number: {
        type: String,
        required: true
    },
    // add reported by (name)
    name: {
        type: String,
        required: true
    },
    // add date 
    date: {
        type: Date,
        default: moment(),
        required: true
    },
    // add bug description
    description: {
        type: String,
        required: true
    },
    // add status (resolved, pending)
    status: {
        type: String,
        enum: ["resolved", "pending"],
        default: "pending",
        required: true
    },
});

// Create and export the model
const BugReport = mongoose.model('BugReport', bugReportSchema);
module.exports = BugReport;
