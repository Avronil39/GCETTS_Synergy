const Notice = require('../models/notice');  // Import the Notice model
const moment = require('moment');           // Import moment.js for date manipulation

// Function to get notices based on semester and department, dated between today and 30 days ago
const getNotices = async (sem, department) => {
  try {
    // Get the date 30 days ago from today
    const thirtyDaysAgo = moment().subtract(30, 'days').startOf('day').toDate();

    // Query the database for notices within the last 30 days for the given semester and department
    const notices = await Notice.find({
      sem: sem,
      department: department,
      date: { $gte: thirtyDaysAgo }  // Date greater than or equal to 30 days ago
    })
      .select('info updated_by');  // Only return the 'info' and 'updated_by' fields

    return notices;  // Return the matching notices
  } catch (error) {
    console.error('Error fetching notices:', error);
    throw error;  // Rethrow the error for handling in the calling function
  }
};

module.exports = getNotices;  // Export the function
