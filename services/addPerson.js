const Student = require('../models/student');  // Import the Student model
const Faculty = require('../models/faculty');  // Import the Faculty model

// Function to add a person (either Faculty or Student) based on the role
const addPerson = (role, data) => {
  try {
    if (role === 'FACULTY') {
      const faculty = new Faculty({
        number: data.number,
        name: data.name,
        department: data.department,
        ishod: data.ishod
      });
      faculty.save()
        .then(() => {
          console.log('Faculty data saved successfully:', faculty);  // Success message
        })
        .catch(err => console.error("Unable to save faculty data:", err));
    } else if (role === 'STUDENT') {
      const student = new Student({
        number: data.number,
        name: data.name,
        sem: data.sem,
        department: data.department,
        roll: data.roll,
        iscr: data.iscr
      });
      student.save()
        .then(() => {
          console.log('Student data saved successfully:', student);  // Success message
        })
        .catch(err => console.log("Unable to save student data:", err));
    } else {
      throw new Error('Unable to understand role ' + role);
    }
  } catch (error) {
    console.error("Error in addPerson:", error);
  }
};

module.exports = addPerson;  // Export the function
