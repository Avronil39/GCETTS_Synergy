// models/student.js
const mongoose = require('mongoose');

// Define the schema for the "students" collection
const studentSchema = new mongoose.Schema({
    number: String,
    name: String,
    sem: Number,
    department: String,
    iscr: Boolean
});

// Create and export the model
const Student = mongoose.model('Student', studentSchema);
module.exports = Student;
