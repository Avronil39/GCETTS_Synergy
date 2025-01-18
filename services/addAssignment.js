const Assignment = require('../models/assignment');

const addAssignment = async (data) => {
    try {
        const assignmentData = {
            semester: data.semester,
            given_by: data.given_by,
            department: data.department,
            subject_name: data.subject_name,
            upload_date: data.upload_date,
            folder_path: data.folder_path,
        };

        // Add optional_msg only if it exists in data
        if (data.optional_msg) {
            assignmentData.optional_msg = data.optional_msg;
        }

        const newAssignment = new Assignment(assignmentData);
        await newAssignment.save();
        console.log('Assignment added successfully:', newAssignment);
    } catch (error) {
        throw error;
    }
}

module.exports = addAssignment;