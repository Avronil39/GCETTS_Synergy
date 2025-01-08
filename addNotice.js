const Notice = require('./models/notice');  // Import the Notice model

// Function to add a new notice
const addNotice = async (data) => {
  try {
    // Create a new notice object using the provided data
    const newNotice = new Notice({
      date: data.date,
      sem: data.sem,
      department: data.department,
      info: data.info,
      updated_by: data.updated_by
    });

    // Save the notice to the database
    await newNotice.save();

    console.log('Notice added successfully:', newNotice);  // Success message
  } catch (error) {
    throw error;
    // console.error('Error adding notice:', error);  // Error handling
  }
};

module.exports = addNotice;  // Export the function
