const mongoose = require('mongoose');
const Config = require('../models/config'); // Assuming Config model is in models directory

// MongoDB connection setup
mongoose.connect('mongodb://localhost:27017/your_database_name', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Configuration initialization code (commented out)
// Creates default configurations for students and faculty
// Uncomment and run once to set up initial configurations

// Create configuration for students
const studentConfig = new Config({
    about: "Student",
    add_person: true,
    delete_person: true,
    add_notice: true,
    delete_notice: true
});

// Create configuration for faculties
const facultyConfig = new Config({
    about: "Faculty",
    add_person: true,
    delete_person: true,
    add_notice: true,
    delete_notice: true
});

// Save to the database
async function initializeConfigs() {
    try {
        // Check if configs already exist
        const existingStudent = await Config.findOne({ about: "Student" });
        const existingFaculty = await Config.findOne({ about: "Faculty" });

        if (!existingStudent) {
            await studentConfig.save();
            console.log("Student configuration saved!");
        } else {
            console.log("Student configuration already exists");
        }

        if (!existingFaculty) {
            await facultyConfig.save();
            console.log("Faculty configuration saved!");
        } else {
            console.log("Faculty configuration already exists");
        }

        // Close the MongoDB connection after saving
        mongoose.connection.close();
        console.log("Configuration initialization completed");
    } catch (err) {
        console.error("Error during configuration initialization:", err);
        mongoose.connection.close();
        process.exit(1);
    }
}

// Run the initialization
initializeConfigs();