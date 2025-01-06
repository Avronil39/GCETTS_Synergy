const mongoose = require('mongoose');
const Student = require('./models/student');  // Import the Student model
const Faculty = require('./models/faculty');  // Import the Faculty model

// Function to find a student or faculty by their number
async function findPersonByNumber(phoneNumber) {
  try {
    // First, try to find the student by number
    let person = await Student.findOne({ number: phoneNumber });
    if (person) {
      // console.log('Student found:', person);
      return { type: 'Student', data: person };
    }

    // If not found in students, try to find the faculty by number
    person = await Faculty.findOne({ number: phoneNumber });
    if (person) {
      // console.log('Faculty found:', person);
      return { type: 'Faculty', data: person };
    }

    // If no match found in both collections
    // console.log('No student or faculty found with that number.');
    return null;
  } catch (err) {
    // console.error('Error finding person:', err);
    throw err;  // Rethrow the error if you want to handle it elsewhere
  }
}

// Export the function to use it in other files
module.exports = findPersonByNumber;
