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

// Middleware to serve static files from 'public' directory
app.use(express.static('public'));

// Middleware for session management
app.use(session({
    secret: "signature_key", // Secret key for signing the session ID cookie
    saveUninitialized: false, // Don't save uninitialized sessions
    resave: false, // Don't resave session if unmodified
    cookie: {
        maxAge: 1000 * 60 * 60 * 12, // Set cookie expiration to 12 hours
    }
}));

// Middleware to parse incoming JSON requests
app.use(express.json()); // Used for parsing JSON request bodies

// Connect to ngrok and get the public URL for local server
let url;
(async function () {
    url = await ngrok.connect(3000); // Create a secure tunnel to the local server
    console.log("NGROK : " + url); // Log the public URL provided by ngrok
})();

// Connect to MongoDB using mongoose
mongoose.connect('mongodb://localhost:27017/gcetts', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB')) // Log success message on successful connection
    .catch(err => console.error('Could not connect to MongoDB...', err)); // Log error if connection fails

// Initialize WhatsApp client with local authentication
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: 'Auth' // Path to store authentication data
    })
});

// Event handler for QR code generation
client.on('qr', qr => {
    qrcode.generate(qr, { small: true }); // Generate and display the QR code in the terminal for WhatsApp login
});

// Event handler for when the client is ready and connected to WhatsApp
client.on('ready', () => {
    // console.clear(); // Uncomment to clear the console on startup
    console.log('Client is ready!'); // Log when the client is successfully connected and ready to send/receive messages
});


// Define emoji constants for better readability and reuse
const calendarEmoji = String.fromCodePoint(0x1F4C5);   // Calendar emoji: 📅
const noticeEmoji = String.fromCodePoint(0x1F4E2);     // Loudspeaker emoji: 📢
const rightArrowEmoji = String.fromCodePoint(0x27A1);  // Right arrow emoji: ➡️
const greenTick = String.fromCodePoint(0x2705);        // Green checkmark emoji: ✅
const redCross = String.fromCodePoint(0x274C);         // Red X emoji: ❌
const blueCircle = String.fromCodePoint(0x1F535);      // Blue circle emoji: 🔵
const questionMark = String.fromCodePoint(0x2753);     // Question mark emoji: ❓
const hiEmoji = String.fromCodePoint(0x1F44B);         // Waving hand emoji: 👋
const redHeart = String.fromCodePoint(0x2764, 0xFE0F); // Heart emoji: ❤️
const clockEmoji = String.fromCodePoint(0x1F552);      // Clock emoji: 🕒
const cautionEmoji = String.fromCodePoint(0x26A0);     // Caution emoji: ⚠️

// Main message handler for all incoming WhatsApp messages
client.on('message_create', async message => {
    try {
        // Fetch configuration settings for both student and faculty at start
        const [studentConfig, facultyConfig] = await Promise.all([
            Config.findOne({ about: "STUDENT" }),
            Config.findOne({ about: "FACULTY" })
        ]);

        // Ensure both configurations exist before proceeding
        if (!studentConfig || !facultyConfig) {
            throw new Error('Required configuration not found');
        }

        // Only process messages that:
        // 1. Are not from the bot itself (fromMe == false)
        // 2. Are from individual chats (@c.us)
        // 3. Start with '$' command prefix
        if (message.id.fromMe == false &&
            message.id.remote.endsWith('@c.us') &&
            message.body.startsWith('$')) {

            // Extract phone number from the sender's ID
            const phone_number = message.from.slice(2, 12);
            // Look up the sender in the database
            let person_data = await Student.findOne({ number: phone_number });
            let person;
            if (person_data) {
                person = { type: 'STUDENT', data: person_data };
            }
            else {
                person_data = await Faculty.findOne({ number: phone_number });
                if (person_data) {
                    person = { type: 'FACULTY', data: person_data };
                }
            }
            // Convert message to uppercase for case-insensitive commands
            const message_body = message.body.toUpperCase();
            // Handle messages from registered students
            if (person && person.type === "STUDENT") {
                // Extract student information from the person object
                const student_data = person.data;
                const sem = student_data.sem;
                const department = student_data.department;
                const rollnumber = student_data.roll;
                const name = student_data.name;

                // Log the message receipt
                console.log("Message from: ", student_data.name);

                // Command handlers:
                // $1 - Get notices
                // $2 - Add notice (CR only)
                // $3 - View/edit config
                // $4 - List class students
                // $5 - List assignments
                // $6 - Get Website URL
                // $7 - Bug Report
                // Media - Submit assignment

                if (message_body.startsWith("$1")) {
                    // Get notices from the last 30 days
                    try {
                        const thirtyDaysAgo = moment().subtract(30, 'days').startOf('day').toDate();
                        const notices = await Notice.find({
                            sem: sem,
                            department: department,
                            date: { $gte: thirtyDaysAgo }
                        }).select('info updated_by');

                        if (notices.length === 0) {
                            console.log('No notice available');
                            await message.reply("No notice in the last 30 days.");
                        } else {
                            console.log('Loading notices from the last 30 days...');
                            await message.reply("Loading notices from the last 30 days...");

                            // Format and reply with the notices
                            let notice_msg = "";
                            for (const notice of notices) {
                                const formattedDate = moment(notice.date).format('YYYY-MM-DD');
                                const temp_notice_info = `Notice Date: *${formattedDate}*\nInfo: ${notice.info}\nUpdated By: *${notice.updated_by}*`;
                                notice_msg += temp_notice_info + "\n********************************\n";
                            }
                            await message.reply(notice_msg);
                            console.log(notice_msg);
                        }
                    } catch (error) {
                        console.error('Error fetching notice:', error);
                        await message.reply("Error fetching notice");
                    }

                } else if (message_body.startsWith("$2")) {
                    // Add notice (only CR can do this)
                    if (student_data.iscr) {
                        if (!studentConfig.add_notice) {
                            await message.reply("System is locked by CR");
                            return;
                        }
                        const [_, notice_info] = message_body.split('_').map(part => part.trim());

                        if (!notice_info) {
                            await message.reply("Please enter the notice info");
                        } else {
                            try {
                                const newNotice = new Notice({
                                    sem: sem,
                                    department: department,
                                    info: notice_info,
                                    updated_by: name
                                });
                                await newNotice.save();
                                await message.reply("Notice added successfully");
                            } catch (error) {
                                await message.reply("Error adding notice");
                                console.error('Error adding notice:', error);
                            }
                        }
                    } else {
                        await message.reply("You are not authorized to do this");
                    }

                } else if (message_body.startsWith("$3")) {
                    // View or edit config
                    try {
                        const [_, toggle_config] = message_body.split('_').map(part => part.trim());
                        let current_config = await Config.findOne({ about: "STUDENT" });

                        const current_config_str =
                            `1 Add person ${current_config.add_person ? greenTick : redCross}` +
                            `\n2 Delete person ${current_config.delete_person ? greenTick : redCross}` +
                            `\n3 Add notice ${current_config.add_notice ? greenTick : redCross}` +
                            `\n4 Delete notice ${current_config.delete_notice ? greenTick : redCross}`;

                        let reply_msg = "$3_toggle to toggle config *(only CR)*\n\nCurrent config is : \n" + current_config_str;

                        if (!toggle_config) {
                            await message.reply(reply_msg);
                            return;
                        }

                        if (toggle_config === "TOGGLE") {
                            if (student_data.iscr) {
                                // Toggle the configuration options
                                current_config.add_person = !current_config.add_person;
                                current_config.delete_person = !current_config.delete_person;
                                current_config.add_notice = !current_config.add_notice;
                                current_config.delete_notice = !current_config.delete_notice;
                                await current_config.save();

                                await message.reply(current_config.add_person ? "System Unlocked by " + name : "System Locked by " + name);
                            } else {
                                await message.reply("Only CR can toggle config");
                            }
                        } else {
                            console.log(`Invalid command ${toggle_config}`);
                            await message.reply("Invalid command" + redCross + "\n" + reply_msg);
                        }
                    } catch (error) {
                        console.log("Error in $3 ", error);
                        await message.reply(`Error in $3 ${redCross}`);
                    }

                } else if (message_body.startsWith("$4")) {
                    // List total students in the same sem and department
                    try {
                        const students = await Student.find({ sem: sem, department: department });
                        let msg = `Total students in sem ${sem} and department ${department} are : \n`;
                        students.forEach(student => {
                            msg += `${student.name} ${student.number}\n`;
                        });
                        await message.reply(msg);
                    } catch (error) {
                        console.error('Error fetching student data:', error);
                        await message.reply("Error fetching student data");
                    }
                } else if (message_body.startsWith("$5")) {
                    // Return list of all assignments
                    try {
                        // Changes done below : List only assignments whose deadline has not passed
                        const assignments = await Assignment.find({
                            semester: sem,
                            department: department,
                            deadline: { $gte: moment() },
                        });

                        if (assignments.length === 0) {
                            await message.reply("No pending assignments found");
                        } else {
                            let msg = "Assignments found\n";
                            for (const [index, assignment] of assignments.entries()) {
                                const isSubmitted = await Submission.findOne({
                                    faculty_number: assignment.faculty_number,
                                    student_roll: rollnumber,
                                    subject_name: assignment.subject_name,
                                });
                                const given_by = await Faculty.findOne({ number: assignment.given_by });
                                msg += `${index + 1}. ${assignment.subject_name} ${given_by ? given_by.name : ""} ${isSubmitted ? greenTick : redCross}\n`;
                            }
                            await message.reply(msg);
                        }
                    } catch (error) {
                        console.error('Error fetching assignments:', error);
                        await message.reply("Error fetching assignments");
                    }

                } else if (message_body.startsWith("$6")) {
                    // Return website URL
                    await message.reply("Url : " + url);

                } else if (message_body.startsWith("$7")) {
                    try {
                        const [_, bug_message] = message_body.split("_").map(part => part.trim());
                        if (!bug_message) {
                            await message.reply("Please add bug description " + questionMark);
                        }
                        const bugreport = new BugReport({
                            number: phone_number,
                            name: name,
                            description: bug_message,
                        })
                        await bugreport.save();
                        await message.reply("Bugreport saved successfully, thanks for reporting " + greenTick);
                    } catch (error) {
                        message.reply("Write bug report in this format " + redCross + "\nExample : $7_System is slow");
                        console.log(error);
                    }
                } else if (message.hasMedia) {
                    // Handle media submission for assignments
                    console.log("Media found");
                    try {
                        const subject_name = message_body.slice(1).trim();
                        if (!subject_name) {
                            await message.reply("Please provide subject name along with media in this format : $SUBJECT");
                            return;
                        }

                        // Search for assignment in the database
                        const assignments = await Assignment.find({ semester: sem, department: department });
                        if (assignments.length === 0) {
                            await message.reply("You don't have any pending assignment");
                            return;
                        }

                        // Find matching assignment by subject name and check deadline
                        const assignment = assignments.find(assignment => {
                            const today = moment().format('YYYY-MM-DD');
                            const deadline = moment(assignment.deadline).format('YYYY-MM-DD');
                            return today <= deadline && assignment.subject_name === subject_name;
                        });

                        if (!assignment) {
                            await message.reply("No pending assignments with such name " + redCross);
                            return;
                        }

                        // Download and save the media file
                        const media = await message.downloadMedia();
                        const doc_name = `${rollnumber}_${name}_${sem}_${department}_${subject_name}`;
                        const folder_path = `./uploads/${department}/${sem}/${subject_name}`;
                        const format = media.mimetype.split('/')[1];
                        const filePath = `${folder_path}/${doc_name}.${format}`;

                        if (!["PDF", "PPTX", "DOC", "DOCX"].includes(format.toUpperCase())) {
                            await message.reply("*Invalid format* " + redCross + " " + format);
                            return;
                        }

                        // Create folder if it doesn't exist
                        if (!fs.existsSync(folder_path)) {
                            fs.mkdirSync(folder_path, { recursive: true });
                        }

                        // Check if the student has already submitted
                        const isSubmitted = await Submission.findOne({
                            student_roll: rollnumber,
                            subject_name: subject_name,
                            faculty_number: assignment.faculty_number
                        });

                        if (isSubmitted) {
                            fs.writeFileSync(filePath, media.data, { encoding: 'base64' });
                            await message.reply("Assignment overwritten successfully");
                        } else {
                            fs.writeFileSync(filePath, media.data, { encoding: 'base64' });

                            const submit = new Submission({
                                faculty_number: assignment.faculty_number,
                                subject_name: subject_name,
                                semester: sem,
                                department: department,
                                student_roll: rollnumber,
                                file_path: filePath
                            });
                            await submit.save();
                            await message.reply("Assignment uploaded successfully");
                        }

                        console.log(`Media saved to ${filePath}`);
                    } catch (error) {
                        console.log("Error submitting assignment\n" + error);
                        message.reply("Error submitting assignment " + redCross);
                    }

                } else {
                    // Default message when the command is not recognized
                    let msg = "*Please select* \n\n";
                    msg += blueCircle + " $1 For all notices within last 30 days\n\n";
                    msg += blueCircle + " $2_noticeInfo to add notice(only CR)\n\n";
                    msg += blueCircle + " $3 To see student configuration\n\n";
                    msg += blueCircle + " $4 To list total student data in your class\n\n";
                    msg += blueCircle + " $5 To list all assignments\n\n";
                    msg += blueCircle + " $6 To get GCETTS website\n\n";
                    msg += cautionEmoji + "$7_Bug message To report a bug\n\n";
                    msg += blueCircle + " $Subject + media to submit assignment";
                    if (message_body !== "$") {
                        msg = redCross + "Unable to understand your query\n\n" + msg;
                    }
                    await message.reply(msg);
                }
            }
            // Handle messages from registered faculty
            else if (person && person.type === "FACULTY") {
                // Faculty command handlers:
                // $1 - Create assignment
                // $2 - View assignment status
                // $3 - Download assignments
                // $4 - List department students
                // $5 - Get website URL
                const faculty_data = person.data;
                const faculty_msg = message_body;

                // Menu message for faculty
                const menu_msg = "*Please select* \n\n" +
                    "$1 to create assignment\n" +
                    "_Syntax : $1_sem_subject_days_optional message_\n\n" +
                    "$2 to view assignment status\n" +
                    "_Syntax : $2_\n\n" +
                    "$3 to download assignments\n" +
                    "_Syntax : $3_subjectName_sem_\n\n" +
                    "$4 to list all students in your department\n" +
                    "_Syntax : $4_sem_\n\n" +
                    "$5 to get website link\n\n" +
                    "$6_Bug message to report a bug ";

                // If the message is "$", show the menu
                if (message_body == "$") {
                    await message.reply(menu_msg);
                }
                // Command to create assignment
                else if (message_body.startsWith("$1")) {
                    try {
                        // Parse the command and arguments
                        let [command, sem, subject, ...optionalMsgParts] = message_body.split('_');
                        sem = parseInt(sem.trim());
                        subject = subject.trim();

                        // Validate semester
                        if (isNaN(sem) || sem < 1 || sem > 8) {
                            await message.reply("Invalid semester");
                            return;
                        }
                        // Validate subject
                        if (!subject || subject.length === 0) {
                            await message.reply("Invalid subject name.");
                            return;
                        }

                        // create folderpath
                        const folder_path = `./uploads/${faculty_data.department}/${sem}/${subject}`;

                        // Prepare assignment data
                        const assignmentData = {
                            semester: sem,
                            department: faculty_data.department,
                            faculty_number: phone_number,
                            subject_name: subject,
                            folder_path: folder_path,
                        }

                        // Handle optional message parts (e.g., deadline and optional message)
                        if (optionalMsgParts.length > 0) {
                            const days = parseInt(optionalMsgParts[0].trim());
                            if (days < 0) {
                                message.reply("Invalid deadline " + redCross);
                                return;
                            }
                            assignmentData.deadline = moment().add(days, 'days').endOf('day');
                            if (optionalMsgParts.length > 1) {
                                assignmentData.optional_msg = optionalMsgParts[1].trim();
                            }
                        }

                        // changes done below
                        // Check if assignment already exists by me or anyone else
                        const checkAssignment = await Assignment.findOne({ subject_name: subject, department: faculty_data.department, semester: sem });
                        if (checkAssignment) {
                            await message.reply("Assignment already exists and will be deleted after deadline " +
                                redCross +
                                `\nDeadline : ${checkAssignment.deadline.toDateString()}` +
                                "\nHint : Use slightly different subject name");
                            return;
                        }

                        // console.log("New assignment \n" + { sem: sem, subject: subject });

                        // Create folder for assignment if not exists
                        if (!fs.existsSync(folder_path)) {
                            // console.log("New folder created : " + folder_path);
                            fs.mkdirSync(folder_path, { recursive: true });
                        }

                        // Save the assignment
                        const newAssignment = new Assignment(assignmentData);
                        await newAssignment.save();
                        console.log("Assignment added successfully");

                        await message.reply("Assignment created successfully");

                        // Fetch assignment data from DB
                        // This code below can be further optimized, again fetched from assignments because if deadline is not provided then database automatically assigns 7 days
                        const AssignmentDataFromDB = await Assignment.findOne({ faculty_number: phone_number, subject_name: subject, semester: sem });

                        // Notify students in the department and semester
                        const students = await Student.find({ department: faculty_data.department, sem: sem });
                        if (students.length == 0) {
                            await message.reply("No students found in this department and semester " + questionMark);
                            return;
                        }
                        for (const student of students) {
                            const phoneNumber = "91" + student.number; // Replace with the recipient's phone number

                            // Prepare the message to send to students
                            const message = `${noticeEmoji} New Assignment from ${faculty_data.name} : ${subject}\nDeadline : ${AssignmentDataFromDB.deadline.toDateString().slice(0, -5)}`;
                            try {
                                await client.sendMessage(`${phoneNumber}@c.us`, message);
                                console.log('Message sent successfully!');
                            } catch (err) {
                                console.error('Error sending message:', err);
                            }
                        }
                    } catch (error) {
                        await message.reply("Error in $1 " + redCross);
                        console.log("Error in $1 ", error);
                    }
                }
                // Command to view assignment status
                else if (message_body.startsWith("$2")) {
                    try {
                        const assignments = await Assignment.find({ faculty_number: phone_number });
                        if (assignments.length == 0) {
                            await message.reply("No assignments found");
                            return;
                        }
                        let msg = "";

                        // changes done below related to counter
                        // let counter = 1;
                        for (const [counter, assignment] of assignments.entries()) {
                            const total_students = await Student.countDocuments({ department: faculty_data.department, sem: assignment.semester });
                            const total_submissions = await Submission.countDocuments({
                                faculty_number: assignment.faculty_number,
                                semester: assignment.semester, // no need to mention department because faculty_number is alraedy provided
                                subject_name: assignment.subject_name
                            });
                            msg += `${counter + 1} ${assignment.subject_name} sem ${assignment.semester} submissions : ${total_submissions}/${total_students}\n`;
                            // counter += 1;
                        }
                        await message.reply(msg);
                    } catch (error) {
                        console.log("Error in $2 ", error);
                        await message.reply("Error in $2 " + redCross);
                    }
                }
                // Command to download assignments
                else if (message_body.startsWith("$3")) {
                    try {
                        let [_, subject, sem] = message_body.split('_');
                        subject = subject.trim();
                        sem = parseInt(sem.trim());
                        if (!subject || !sem || sem > 8 || sem < 1) {
                            await message.reply("Please provide subject name in this format $3_subjectName_sem " + redCross);
                            return;
                        }
                        const assignment = await Assignment.findOne({ subject_name: subject, faculty_number: phone_number, semester: sem });
                        if (assignment)
                            console.log("assignment found\n", assignment);
                        else
                            console.log("assignment not fonund\n");
                        if (!assignment) {
                            await message.reply("No assignments found\nProvide subject name in this format $3_subjectName");
                            return;
                        }
                        console.log(`finding submissions in ${assignment.department} ${assignment.semester} ${assignment.subject_name}`);
                        const submissions = await Submission.countDocuments({ department: assignment.department, semester: assignment.semester, subject_name: assignment.subject_name });
                        if (submissions)
                            console.log("submissions found\n", submissions);
                        else
                            console.log("submissions not fonund\n");

                        if (submissions == 0) {
                            await message.reply("0 submissions for this assignment");
                            return;
                        }

                        await message.reply(submissions + " submissions found, creating archives. Please wait... " + clockEmoji);

                        // Create archive folder if not exists
                        const archive_path = `./Archives/${faculty_data.department}/${assignment.semester}`;

                        if (!fs.existsSync(archive_path)) {
                            fs.mkdirSync(archive_path, { recursive: true });
                        }

                        const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
                        const zipFileName = `${subject}_${timestamp}.zip`;
                        const zipFilePath = `${archive_path}/${zipFileName}`;

                        const output = fs.createWriteStream(zipFilePath);
                        const archive = archiver('zip', { zlib: { level: 9 } });

                        output.on('close', () => console.log(`Archive created at ${zipFilePath}: ${archive.pointer()} bytes`));
                        archive.on('error', (err) => console.error(err));

                        archive.pipe(output);

                        // changes done below
                        // const pdf_path = `./uploads/${faculty_data.department}/${assignment.semester}/${subject}`;
                        const pdf_path = assignment.folder_path;
                        archive.directory(pdf_path, false);
                        await archive.finalize();

                        await new Promise((resolve) => output.on('close', resolve));

                        const fileBuffer = fs.readFileSync(zipFilePath);
                        const media = new MessageMedia(
                            'application/zip',
                            fileBuffer.toString('base64'),
                            zipFileName
                        );

                        await message.reply(media);
                    } catch (error) {
                        console.log("Error in $3 ", error);
                        await message.reply("Error in $3 " + redCross);
                    }
                }
                // Command to list department students
                else if (message_body.startsWith("$4")) {
                    const [_, sem] = message_body.split('_');
                    if (!sem || isNaN(sem) || sem < 1 || sem > 8) {
                        await message.reply("Invalid semester " + redCross + "\nSemester values range from 1 to 8");
                        return;
                    }
                    const students = await Student.find({ department: faculty_data.department, sem: sem });
                    if (students.length == 0) {
                        await message.reply("No student record found");
                        return;
                    }
                    let msg = "";
                    for (const student of students) {
                        if (student.iscr) {
                            msg += "_" + student.name + "_ " + student.number + "\n";
                        }
                        else {
                            msg += student.name + " " + student.number + "\n";
                        }
                    }
                    await message.reply(msg);
                }
                // Command to return website URL
                else if (message_body.startsWith("$5")) {
                    await message.reply("Url : " + url);
                }
                // Command to store bug information
                else if (message_body.startsWith("$6")) {
                    try {
                        const [_, bug_message] = message_body.split("_").map(part => part.trim());
                        if (!bug_message) {
                            await message.reply("Please add bug description " + questionMark);
                        }
                        const bugreport = new BugReport({
                            number: phone_number,
                            name: faculty_data.name,
                            description: bug_message,
                        })
                        await bugreport.save();
                        await message.reply("Bugreport saved successfully, thanks for reporting " + greenTick);

                    } catch (error) {
                        message.reply("Write bug report in this format " + redCross + "\nExample : $7_System is slow");
                        console.log(error);
                    }
                }
                // Default response if the message is not recognized
                else {
                    await message.reply("Unable to understand your query" + redCross + "\n\n" + menu_msg);
                }
            }
            // Handle registration for new users
            else if (person == null) {
                // Registration formats:
                // Students: $_STUDENT_NAME_DEPARTMENT_SEM_ROLLNUMBER
                // Faculty: $_FACULTY_NAME_DEPARTMENT
                // Registrations are closed for both student and faculties
                if (studentConfig.add_person == false && facultyConfig.add_person == false) {
                    await message.reply("Registration feature is disabled");
                    return;
                }
                const REGISTRATION_MESSAGE = "\n\nYou are not registered in the database\n\n" +
                    "Register yourself in this format below\n\n" +
                    "For Faculty: $_role_name_department\n\n" +
                    rightArrowEmoji + "example: $_FACULTY_Manjari Saha_CSE\n\n" +
                    "For Student: $_role_name_department_sem_rollnumber\n\n" +
                    rightArrowEmoji + "example: $_STUDENT_Avro Banerjee_CSE_7_11000121016\n\n" +
                    "Departments : (CSE , IT, TT, APM)";
                console.log("message from unknown person " + phone_number);
                if (message_body == "$") {
                    await message.reply("*Welcome to GCETTS* " + redHeart + REGISTRATION_MESSAGE);
                    return;
                }
                try {
                    // Format: $_ROLE_NAME_DEPARTMENT_SEM_ROLLNUMBER (for students)
                    // Format: $_ROLE_NAME_DEPARTMENT (for faculty)
                    const [_, role, name, department, ...remainingParts] = message_body.split('_');
                    // Validate basic fields
                    if (!role || !name || !department) {
                        throw new Error("Invalid registration format");
                    }
                    if (department !== "CSE" && department !== "IT" && department !== "TT" && department !== "APM") {
                        await message.reply(`Invalid department ${redCross}\nDepartments : (CSE , IT, TT, APM)`);
                        throw new Error("Invalid department\nDepartments : (CSE , IT, TT, APM)");
                    }

                    if (role === "STUDENT") {
                        const [sem, rollnumber] = remainingParts;
                        if (!sem || !rollnumber) {
                            throw new Error("Invalid student registration format");
                        }
                        if (isNaN(sem) || sem < 1 || sem > 8) {
                            await message.reply("Invalid semester " + redCross + "\nSemester values range from 1 to 8");
                            throw new Error("Invalid semester");
                        }
                        // changes made below
                        const checkRollExists = await Student.findOne({ roll: rollnumber });
                        if (checkRollExists) {
                            message.reply("Rollnumber already exists, Contact system admin ");
                            return;
                        }
                        console.log({ role, name, department, sem, rollnumber });

                        if (studentConfig.add_person === false) {
                            // add person false for students
                            await message.reply("Registration feature is disabled");
                        } else {
                            // add person true for students
                            const student = new Student({
                                number: phone_number,
                                name: name,
                                sem: sem,
                                department: department,
                                roll: rollnumber
                            });
                            await student.save();
                            await message.reply(`Hi ${name} ${hiEmoji}\nthank you for registering\nSend $ for menu`);
                        }
                    } else if (role === "FACULTY") {
                        if (remainingParts.length > 0) {
                            throw new Error("Invalid faculty registration format");
                        }
                        console.log({ role, name, department });

                        const facultyConfig = await Config.findOne({ about: "FACULTY" });
                        if (facultyConfig.add_person === false) {
                            await message.reply("Registration feature is disabled");
                        } else {
                            const faculty = new Faculty({
                                number: phone_number,
                                department: department,
                                name: name
                            })
                            await faculty.save();

                            await message.reply(`Hi Prof. ${name}\nthank you for registering\nSend $ for menu`);
                        }
                    } else {
                        await message.reply(`Invalid role ${redCross}\nRoles : (STUDENT , FACULTY)`);
                        throw new Error("Invalid role");
                    }
                } catch (error) {
                    console.log("inside registration catch block \n", error);
                    await message.reply("*Welcome to GCETTS* " + redHeart + REGISTRATION_MESSAGE);
                }
            }
        }
    }
    catch (error) {
        console.log("error ", error);
    }
});

// copy express code here




// listen
app.listen(port, () => {
    console.log(`Express app listening on port ${port}`)
})
// Initialize WhatsApp client and connect
client.initialize();
