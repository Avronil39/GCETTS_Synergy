const mongoose = require('mongoose');
const Student = require('../models/student');  // Import the Student model
const Faculty = require('../models/faculty');  // Import the Faculty model

// Function to find a student or faculty by their number
async function findPerson(number) {
  try {
    // First, try to find the student by number
    let person = await Student.findOne({ number: number });
    if (person) {
      // console.log('Student found:', person);
      return { type: 'STUDENT', data: person };
    }

    // If not found in students, try to find the faculty by number
    person = await Faculty.findOne({ number: number });
    if (person) {
      // console.log('Faculty found:', person);
      return { type: 'FACULTY', data: person };
    }
    // If no match found in both collections
    // console.log('No student or faculty found with that number.');
    return null;
  } catch (err) {
    // console.error('Error finding person:', err);
    console.log("Error findPerson:", err);
  }
}

// Export the function to use it in other files
module.exports = findPerson;
