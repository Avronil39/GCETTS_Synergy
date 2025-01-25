// Import required modules
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mongoose = require('mongoose');
const moment = require('moment');
const fs = require('fs');
const archiver = require('archiver');
const express = require('express')


// Import models
const Student = require('./models/student');
const Faculty = require('./models/faculty');
const Config = require('./models/config');
const Assignment = require('./models/assignment');
const Notice = require('./models/notice');
const BugReport = require('./models/bugreport');

const app = express()
const port = 3000

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})



console.clear();
// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/gcetts', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB...', err));

// Initialize WhatsApp client with local authentication
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: 'Auth'
    })
});

// 1. QR code event should come first
client.on('qr', qr => {
    qrcode.generate(qr, { small: true }); // Generate and display QR code in terminal
});

// 2. Ready event
client.on('ready', () => {
    // console.clear(); // Clear console when ready
    console.clear();
    console.log('Client is ready!'); // Log that the client is ready
});

// Define emoji constants for better readability and reuse
const calendarEmoji = String.fromCodePoint(0x1F4C5);  // Calendar emoji: 📅
const noticeEmoji = String.fromCodePoint(0x1F4E2);    // Loudspeaker emoji: 📢
const rightArrowEmoji = String.fromCodePoint(0x27A1); // Right arrow emoji: ➡️
const greenTick = String.fromCodePoint(0x2705);       // Green checkmark emoji: ✅
const redCross = String.fromCodePoint(0x274C);        // Red X emoji: ❌
const blueCircle = String.fromCodePoint(0x1F535);     // Blue circle emoji: 🔵
const questionMark = String.fromCodePoint(0x2753);    // Question mark emoji: ❓
const hiEmoji = String.fromCodePoint(0x1F44B);        // Waving hand emoji: 👋
const redHeart = String.fromCodePoint(0x2764, 0xFE0F); // ❤️


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
                // Extract student information
                const student_data = person.data;
                const sem = student_data.sem;
                const department = student_data.department;
                const rollnumber = student_data.roll;
                const name = student_data.name;

                // Log message receipt
                console.log("Message from : ", student_data.name);

                // Command handlers:
                // $1 - Get notices
                // $2 - Add notice (CR only)
                // $3 - View/edit config
                // $4 - List class students
                // $5 - List assignments
                // Media - Submit assignment

                if (message_body.startsWith("$1")) { // working
                    // get notice updates
                    try {
                        const thirtyDaysAgo = moment().subtract(30, 'days').startOf('day').toDate();
                        const notices = await Notice.find({
                            sem: sem,
                            department: department,
                            date: { $gte: thirtyDaysAgo }
                        }).select('info updated_by');

                        if (notices.length === 0) {
                            console.log('No notice available');  // If no notices found
                            await message.reply("No notice in the last 30 days.");
                        } else {
                            console.log('Loading notices from the last 30 days...');
                            await message.reply("Loading notices from the last 30 days...");

                            // Loop through the notices and reply with each one
                            let notice_msg = "";
                            for (const notice of notices) {
                                const formattedDate = moment(notice.date).format('YYYY-MM-DD');  // Format the date
                                const temp_notice_info = `Notice Date: *${formattedDate}*\nInfo: ${notice.info}\nUpdated By: *${notice.updated_by}*`;
                                notice_msg += temp_notice_info + "\n********************************\n";
                                // Reply with the formatted notice information
                            }
                            await message.reply(notice_msg);
                            console.log(notice_msg);
                        }
                    } catch (error) {
                        console.error('Error fetching notice:', error);  // Handle any errors
                        await message.reply("Error fetching notice");
                    }

                } else if (message_body.startsWith("$2")) {
                    // add notice only cr can do this
                    if (student_data.iscr == true) {
                        if (studentConfig.add_notice == false) {
                            await message.reply("System is locked by CR");
                            return;
                        }
                        const [_, notice_info] = message_body.split('_').map(part => part.trim());

                        if (notice_info.length == 0) {
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
                    }
                    else {
                        await message.reply("You are not authorized to do this");
                    }
                } else if (message_body.startsWith("$3")) {
                    // view or edit config
                    try {
                        const [_, toggle_config] = message_body.split('_').map((part) => part.trim());
                        let current_config = await Config.findOne({ about: "STUDENT" });
                        const current_config_str = `1 Add person ${current_config.add_person ? greenTick : redCross}` +
                            `\n2 Delete person ${current_config.delete_person ? greenTick : redCross}` +
                            `\n3 Add notice ${current_config.add_notice ? greenTick : redCross}` +
                            `\n4 Delete notice ${current_config.delete_notice ? greenTick : redCross}`;
                        let reply_msg = "$3_toggle to toggle config *(only CR)*\n\nCurrent config is : \n" + current_config_str;
                        if (!toggle_config) {
                            await message.reply(reply_msg);
                            return;
                        }
                        if (toggle_config == "TOGGLE") {
                            if (student_data.iscr == true) {
                                current_config.add_person = !(current_config.add_person);
                                current_config.delete_person = !(current_config.delete_person);
                                current_config.add_notice = !(current_config.add_notice);
                                current_config.delete_notice = !(current_config.delete_notice);
                                current_config.save();
                                if (current_config.add_person == true) {
                                    await message.reply("System Unlocked by " + name);
                                }
                                else {
                                    await message.reply("System Locked by " + name);
                                }
                            }
                            else {
                                await message.reply("Only CR can toggle config");
                            }
                        }
                        else {
                            console.log(`Invalid command ${toggle_config}`);
                            await message.reply("Invalid command" + redCross + "\n" + reply_msg);
                        }
                    } catch (error) {
                        console.log("Error in $3 ", error);
                        await message.reply(`Error in $3 ${redCross}`);
                    }
                } else if (message_body.startsWith("$4")) {
                    // list total student data with same sem and department
                    try {
                        const students = await Student.find({ sem: sem, department: department });
                        let msg = `Total students in sem ${sem} and department ${department} are : \n`;
                        for (const student of students) {
                            msg += student.name + " " + student.number + "\n";
                        }
                        await message.reply(msg);
                    } catch (error) {
                        console.error('Error fetching student data:', error);
                        await message.reply("Error fetching student data");
                    }
                } else if (message_body.startsWith("$5")) {
                    // return list of all assignments
                    try {
                        const assignments = await Assignment.find({ semester: sem, department: department });
                        if (assignments.length == 0) {
                            await message.reply("No pending assignments found");
                        } else {
                            let msg = "Assignments found\n";
                            let counter = 1;
                            for (const assignment of assignments) {
                                const given_by = await Faculty.findOne({ number: assignment.given_by });
                                msg += (counter.toString() + " " + assignment.subject_name + " " + given_by + "\n");
                                counter += 1;
                                console.log(counter);
                            }
                            await message.reply(msg);
                        }
                    } catch (error) {
                        console.error('Error fetching assignments:', error);
                        await message.reply("Error fetching assignments");
                    }
                } else if (message.hasMedia) {
                    // pending features
                    // assignment overwrite // implemented not tested
                    // increment submission count  // implemented not tested
                    // check if deadline is crossed // implemented not tested

                    console.log("Media found");
                    console.log("Message body : ", message_body, "\n\n");
                    // with media students only provide $subjectname
                    const subject_name = message_body.slice(1).trim();
                    // search for assignment in the database
                    const assignments = await Assignment.find({ semester: sem, department: department });

                    if (assignments.length == 0) {
                        await message.reply("You dont have any pending assignment");
                    } else {
                        if (assignments.some(assignment => {
                            const today = moment().format('YYYY-MM-DD');
                            const deadline = moment(assignment.deadline).format('YYYY-MM-DD');
                            return today <= deadline && assignment.subject_name === subject_name
                        })) {
                            try {
                                // Download the media
                                const media = await message.downloadMedia();
                                // doc_name is rollnumber_name_sem_department_subject_name
                                const doc_name = rollnumber + "_" + name + "_" + sem + "_" + department + "_" + subject_name;
                                // Save the media to a file
                                const folder_path = `./uploads/${department}/${sem}/${subject_name}`;
                                const format = media.mimetype.split('/')[1];
                                const filePath = `${folder_path}/${doc_name}.${format}`;

                                if (format.toUpperCase() != "PDF" && format.toUpperCase() != "PPTX" && format.toUpperCase() != "DOC") {
                                    await message.reply("*Invalid format* " + format);
                                    return;
                                }

                                // check if folder exists
                                // if not then reply that, deadline crossed
                                if (!fs.existsSync(folder_path)) {

                                    await message.reply("Currently submission is closed");
                                }
                                else {
                                    // check if file_path file already exists
                                    if (fs.existsSync(filePath)) {
                                        fs.writeFileSync(filePath, media.data, { encoding: 'base64' });
                                        await message.reply("Assignment overwritten successfully");
                                    }
                                    else {
                                        fs.writeFileSync(filePath, media.data, { encoding: 'base64' });
                                        // increment submission count of that assignment 
                                        const currDoc = await Assignment.findOne({
                                            subject_name: subject_name,
                                            semester: sem
                                        });
                                        if (!currDoc)
                                            console.log("currDoc is NULL\n***********************************");
                                        await Assignment.updateOne({ subject_name: subject_name, semester: sem }, { submissions: currDoc.submissions + 1 });
                                        await message.reply("Assignment uploaded successfully");
                                    }
                                }
                                console.log(`Media saved to ${filePath}`);
                            } catch (err) {
                                await message.reply("Assignment submission failed" + redCross);
                                console.error('Failed to download media:', err);
                            }
                        } else {
                            await message.reply("Assignment not found " + questionMark);
                        }
                    }
                } else {
                    // add blueCircle before every line of the below message

                    let msg = "*Please select* \n\n";
                    msg += blueCircle + " $1 For all notices within last 30 days\n\n";
                    msg += blueCircle + " $2_noticeInfo to add notice(only CR)\n\n";
                    msg += blueCircle + " $3 To see student configuration\n\n";
                    msg += blueCircle + " $4 To list total student data int your class\n\n";
                    msg += blueCircle + " $5 To list all assignments\n\n";
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

                const faculty_data = person.data;
                const faculty_msg = message_body;
                const menu_msg = "*Please select* \n\n" +
                    "$1 to create assignment\n" +
                    "_Syntax : $1_sem_subject_days_optional message_\n\n" +
                    "$2 to view assignment status\n" +
                    "_Syntax : $2_\n\n" +
                    "$3 to download assignments\n" +
                    "_Syntax : $3_subjectName_\n\n" +
                    "$4 to list all students in your department\n" +
                    "_Syntax : $4_sem_";
                if (message_body == "$") {
                    await message.reply(menu_msg);
                }
                else if (message_body.startsWith("$1")) { // working
                    // create assignment
                    // syntax : $1_sem_subject_days_optional_msg
                    try {
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
                        // if assignment with same subject and same faculty_number exists
                        // then reply that assignment already exists and will be deleted after deadline
                        const checkAssignment = await Assignment.findOne({ subject_name: subject, faculty_number: phone_number, semester: sem });
                        if (checkAssignment) {
                            await message.reply("Assignment already exists and will be deleted after deadline " + redCross + `\nDeadline : ${checkAssignment.deadline.toDateString()}`);
                            return;
                        }
                        console.log({ sem: sem, subject: subject });

                        const folder_path = `./uploads/${faculty_data.department}/${sem}/${subject}`;
                        if (!fs.existsSync(folder_path)) {
                            console.log("New folder created : " + folder_path);
                            fs.mkdirSync(folder_path, { recursive: true });
                        }

                        // add assignment
                        const assignmentData = {
                            semester: sem,
                            department: faculty_data.department,
                            faculty_number: phone_number,
                            subject_name: subject,
                            folder_path: folder_path,
                        }
                        if (optionalMsgParts.length > 0) {
                            // default deadline is 7 days from today
                            const days = optionalMsgParts[0].trim();
                            assignmentData.deadline = moment().add(days, 'days').endOf('day');
                            if (optionalMsgParts.length > 1) {
                                assignmentData.optional_msg = optionalMsgParts[1].trim();
                            }
                        }
                        const newAssignment = new Assignment(assignmentData);
                        await newAssignment.save();
                        console.log("Assignment added successfully");

                        await message.reply("Assignment created successfully");
                        const AssignmentDataFromDB = await Assignment.findOne({ faculty_number: phone_number, subject_name: subject, semester: sem });

                        // notify all students in the department in the sem about this assignment
                        const students = await Student.find({ department: faculty_data.department, sem: sem });
                        if (students.length == 0) {
                            await message.reply("No students found in this department and semester");
                            return;
                        }
                        for (const student of students) {
                            const phoneNumber = "91" + student.number; // Replace with the recipient's phone number

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
                else if (message_body.startsWith("$2")) { // working
                    try {
                        // Assignment status
                        // message_body in this format $2
                        // list all assignments in the database
                        // find all assignments where faculty_number == phone number
                        const assignments = await Assignment.find({ faculty_number: phone_number });
                        if (assignments.length == 0) {
                            await message.reply("No assignments found");
                            return;
                        }
                        let msg = "";
                        let counter = 1;
                        for (const assignment of assignments) {
                            // calculate total number of students in the department and sem of that assignment
                            const total_students = await Student.countDocuments({ department: faculty_data.department, sem: assignment.semester });
                            msg += counter.toString() + " " + assignment.subject_name + " sem : " + assignment.semester + " submissions : " + assignment.submissions + "/" + total_students + "\n";
                            counter += 1;
                        }
                        await message.reply(msg);
                    } catch (error) {
                        console.log("Error in $2 ", error);
                        await message.reply("Error in $2 " + redCross);
                    }
                }
                else if (message_body.startsWith("$3")) { // Download assignments
                    try {
                        let [_, subject] = message_body.split('_');
                        subject = subject.trim();
                        if (!subject) {
                            await message.reply("Please provide subject name in this format $3_subjectName");
                            return;
                        }
                        const assignment = await Assignment.findOne({ subject_name: subject, faculty_number: phone_number });
                        if (!assignment) {
                            await message.reply("No assignments found\nProvide subject name in this format $3_subjectName");
                            return;
                        }
                        if (assignment.submissions == 0) {
                            await message.reply("0 submissions for this assignment");
                            return;
                        }

                        await message.reply("Assignments found creating archives please wait");

                        // Create the archive directory path
                        const archive_path = `./Archives/${faculty_data.department}/${assignment.semester}`;
                        if (!fs.existsSync(archive_path)) {
                            fs.mkdirSync(archive_path, { recursive: true });
                        }

                        // Create a filename that includes the subject and current date/time
                        const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
                        const zipFileName = `${subject}_${timestamp}.zip`;
                        const zipFilePath = `${archive_path}/${zipFileName}`;

                        // Create a new file to write our zip to
                        const output = fs.createWriteStream(zipFilePath);

                        // Create a new zip archive with maximum compression
                        const archive = archiver('zip', { zlib: { level: 9 } });

                        // When the zip is fully created, log its location and size
                        output.on('close', () => console.log(`Archive created at ${zipFilePath}: ${archive.pointer()} bytes`));

                        // If something goes wrong while creating the zip, show the error
                        archive.on('error', (err) => console.error(err));

                        // Connect the zip creator to our output file
                        archive.pipe(output);

                        // Set the folder path where student submissions are stored
                        const pdf_path = `./uploads/${faculty_data.department}/${assignment.semester}/${subject}`;

                        // Add all files from the submissions folder into the zip
                        archive.directory(pdf_path, false);

                        // Create the final zip file
                        await archive.finalize();

                        // Wait for the archive to finish writing
                        await new Promise((resolve) => output.on('close', resolve));

                        // Read the file as a buffer and convert to base64
                        const fileBuffer = fs.readFileSync(zipFilePath);
                        const media = new MessageMedia(
                            'application/zip',
                            fileBuffer.toString('base64'),
                            zipFileName
                        );

                        // Send the file
                        await message.reply(media);

                        // Optionally cleanup the zip file after sending
                        // fs.unlinkSync(zipFilePath);
                    } catch (error) {
                        console.log("Error in $3 ", error);
                        await message.reply("Error in $3 " + redCross);
                    }
                }
                else if (message_body.startsWith("$4")) {
                    // list all students in his/her department with the given sem
                    // message_body in this format $3_1 (sem values range from 1 to 8)
                    const [_, sem] = message_body.split('_');
                    if (!sem || isNaN(sem) || sem < 1 || sem > 8) {
                        await message.reply("Invalid semester " + redCross + "\nSemester values range from 1 to 8");
                        return;
                    }
                    const students = await Student.find({ department: faculty_data.department, sem: sem });
                    let msg = "";
                    for (const student of students) {
                        msg += student.name + " " + student.number + "\n";
                    }
                    await message.reply(msg);
                }
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

// Initialize WhatsApp client and connect
client.initialize();
