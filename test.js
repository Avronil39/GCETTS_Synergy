// Import required modules
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js'); // WhatsApp client and message media handling
const qrcode = require('qrcode-terminal'); // For generating and displaying QR code in terminal
const mongoose = require('mongoose'); // MongoDB ORM for database interaction
const moment = require('moment'); // Date and time manipulation library
const fs = require('fs'); // File system handling
const archiver = require('archiver'); // Archive files (zip)
const express = require('express'); // Web framework for handling HTTP requests
const session = require('express-session'); // Session management for user sessions
const bodyParser = require('body-parser'); // Middleware to parse incoming request bodies
const ngrok = require('ngrok'); // For creating secure tunnels to localhost (useful for development)
const path = require('path'); // For handling and transforming file paths

// Importing models for MongoDB interaction
const Student = require('./models/student'); // Student model
const Faculty = require('./models/faculty'); // Faculty model
const Config = require('./models/config'); // Configuration model
const Assignment = require('./models/assignment'); // Assignment model
const Notice = require('./models/notice'); // Notice model
const Submission = require('./models/submission'); // Submission model
const BugReport = require('./models/bugreport'); // Bug report model

// Express app configuration
const app = express(); // Create an instance of Express
const port = 3000; // Port number for the app to run

// Connect to MongoDB using mongoose
mongoose.connect('mongodb://localhost:27017/gcetts', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB')) // Log success message on successful connection
    .catch(err => console.error('Could not connect to MongoDB...', err)); // Log error if connection fails


// Middleware to serve static files from 'public' directory
app.use(express.static('public'));
app.use(express.static('uploads'));
// Middleware for session management
app.use(session({
    secret: "signature_key", // Secret key for signing the session ID cookie
    saveUninitialized: false, // Don't save uninitialized sessions
    resave: false, // Don't resave session if unmodified
    cookie: {
        maxAge: 1000 * 60 * 60 * 12, // Set cookie expiration to 12 hours
        secure: false,
    }
}));
// Middleware to parse incoming JSON requests
app.use(express.json()); // Used for parsing JSON request bodies
// Connect to MongoDB using mongoose

app.listen(port, () => {
    console.log(`Express app listening on port ${port}`)
})
// below code will be pasted on actual file after separate testing
// **********************************************************************************************

// variables in session
// isLoggedin
// mobile_number
// person

app.get("/", (req, res) => {
    try {
        // if not logged in 
        if (!req.session.isLoggedin) {
            return res.redirect("/login");
        }
        else {
            if (req.session.person.type === "STUDENT") {
                return res.render("student.ejs", { studentName: req.session.person.data.name });
            }
            else if (req.session.person.type === "FACULTY") {
                res.redirect("/assignments");
            }
            else {
                return res.json({ message: "ERROR! Unknown person type" });
            }
        }
    } catch (error) {
        console.log(error);
        return res.json({ message: "Error in /,check server logs" });
    }
})
app.get("/assignments/:subject?", async (req, res) => {
    try {
        if (!req.session.isLoggedin || req.session.person.type !== "FACULTY") {
            return res.redirect("/");
        }
        const mobile_number = req.session.mobile_number;
        const person = req.session.person;

        const assignments = await Assignment.find({ faculty_number: mobile_number });
        const subject = req.params.subject;

        if (!subject) {
            const data = {
                faculty_name: person.data.name,
                subjects: assignments.map(assignment => assignment.subject_name),
            };
            return res.render("faculty.ejs", data);
        }
        else {
            res.json({ message: "Under development" });
        }
    } catch (error) {
        console.log(error);
        res.json({ message: Error });
    }
})


// login logout related
app.get("/login", (req, res) => {
    if (req.session.isLoggedin) {
        return res.redirect("/");
    }
    return res.sendFile("public/login.html", { root: __dirname }); // placed in /public
})
app.post("/send-otp", async (req, res) => {
    const { mobile } = req.body;
    try {
        if (mobile.length != 10) { // will add more checks later
            return res.json({ message: "Request from unknown source" });
        }
        // Check if person exists in database
        let person_data = await Student.findOne({ number: mobile });
        let person;
        if (person_data) {
            person = { type: 'STUDENT', data: person_data };
        } else {
            person_data = await Faculty.findOne({ number: mobile });
            if (person_data) {
                person = { type: 'FACULTY', data: person_data };
            }
        }
        if (!person) {
            console.log("Unknown person\n");
            return res.json({ message: "Unregistered" });
        }

        // Generate OTP (for testing, use a fixed value)
        const otp = "123456";
        req.session.mobile_number = mobile;
        req.session.person = person;
        req.session.generatedOtp = otp;
        req.session.otpTimestamp = Date.now();
        console.log(`OTP for ${mobile}: ${otp}`); // Log OTP for testing
        res.json({ message: "Successful" });
    } catch (error) {
        console.error("Error in /send-otp:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
app.post("/verify-otp", (req, res) => {
    const { mobile, otp } = req.body;
    const currentTime = Date.now();
    const otpExpirationTime = 30 * 1000; // 30 seconds

    if (!req.session.generatedOtp || !req.session.otpTimestamp) {
        return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }

    if (
        req.session.mobile_number === mobile &&
        req.session.generatedOtp === otp &&
        currentTime - req.session.otpTimestamp < otpExpirationTime
    ) {
        req.session.isLoggedin = true;
        delete req.session.generatedOtp;
        delete req.session.otpTimestamp;
        return res.json({ message: "Successful" });
    }

    return res.status(400).json({ message: "Failed or OTP expired" });
});
app.post('/logout', (req, res) => {
    try {
        // Destroy the session
        req.session.destroy((err) => {
            if (err) {
                // If an error occurs during session destruction, send an error response
                return res.status(500).json({ message: 'Failed to log out' });
            }
            // Clear the session cookie from browser
            res.clearCookie('connect.sid');
            // res.clearCookie('connect.sid', { path: '/' }); // gpt suggested, need to learn, skipped for now
            // Send success response
            res.json({ message: 'Logged out successfully' });
        });
    } catch (error) {
        // Handle any unexpected errors
        console.error('Error logging out:', error);
        res.status(500).json({ message: 'Failed to log out' });
    }
});
