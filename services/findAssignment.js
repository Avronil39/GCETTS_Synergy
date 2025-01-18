// takes semester, department and returns list of all assignments
const mongoose = require('mongoose');
const Assignment = require('../models/assignment');

// add optional parameter 
async function findAssignment(semester, department) {
    try {
        const assignments = await Assignment.find({ semester: semester, department: department });
        return assignments;
    } catch (error) {
        console.error('Error finding assignments:', error);
        return [];
    }
}

module.exports = findAssignment;
