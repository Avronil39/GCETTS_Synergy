// takes semester, department and returns list of all assignments
const mongoose = require('mongoose');
const Assignment = require('../models/assignment');

// add optional parameter subject_name
async function findAssignment(semester, department, subject_name) {
    try {
        if (subject_name){
            const assignments = await Assignment.find({ semester: semester, department: department, subject_name: subject_name });
            return assignments;
        }
        else {
            const assignments = await Assignment.find({ semester: semester, department: department });
            return assignments;
        }
    } catch (error) {
        console.error('Error finding assignments:', error);
        return [];
    }
}

module.exports = findAssignment;
