// Import required modules
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mongoose = require('mongoose');
const moment = require('moment');
const fs = require('fs');

// Import models and utility functions
const Student = require('./models/student');
const Faculty = require('./models/faculty');
const Config = require('./models/config');
const Assignment = require('./models/assignment');
const findPerson = require('./services/findPerson');
const addPerson = require('./services/addPerson');
const getNotices = require('./services/getNotices');
const addNotice = require('./services/addNotice');
const addAssignment = require('./services/addAssignment');
const findAssignment = require('./services/findAssignment');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/gcetts', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB...', err));

// Initialize WhatsApp client
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
    console.log('Client is ready!'); // Log that the client is ready
});

// Handle incoming messages
client.on('message_create', async message => {
    try {
        if (message.id.fromMe == false &&
            message.id.remote.endsWith('@c.us') &&
            message.body.startsWith('$')) {

            const phone_number = message.from.slice(2, 12);
            const person = await findPerson(phone_number);

            // Handle student messages
            if (person && person.type === "STUDENT") {
                // await message.reply("Hi "+person.data.name);
                const student_data = person.data;
                const sem = student_data.sem;
                const department = student_data.department;
                const rollnumber = student_data.roll;
                const name = student_data.name;

                console.log("Message from : ", student_data.name);
                // $1 get notices, $2 add notice, $3 for student config, $4 list all students, add media to upload assignment
                if (message.body.startsWith("$1")) {
                    // get notice updates
                    try {
                        const notices = await getNotices(sem, department);

                        if (notices.length === 0) {
                            console.log('No notice available');  // If no notices found
                            await message.reply("No notice in the last 30 days.");
                        } else {
                            console.log('Loading notices from the last 30 days...');
                            await message.reply("Loading notices from the last 30 days...");

                            // Loop through the notices and reply with each one
                            for (const notice of notices) {
                                const formattedDate = moment(notice.date).format('YYYY-MM-DD');  // Format the date
                                const temp_notice_info = `Notice Date: *${formattedDate}*\nInfo: ${notice.info}\nUpdated By: *${notice.updated_by}*`;

                                // Reply with the formatted notice information
                                await message.reply(temp_notice_info);
                                console.log(temp_notice_info);
                            }
                        }
                    } catch (error) {
                        console.error('Error fetching notice:', error);  // Handle any errors
                    }

                } else if (message.body.startsWith("$2")) {
                    // add notice only cr can do this
                    if (student_data.iscr == true) {
                        const notice_info = message.body.slice(3);
                        if (notice_info.length == 0) {
                            await message.reply("Please enter the notice info");
                        } else {
                            const notice_data = {
                                date: moment().format('YYYY-MM-DD'),
                                sem: sem,
                                department: department,
                                info: notice_info,
                                updated_by: name
                            };
                            try {
                                await addNotice(notice_data);
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
                } else if (message.body.startsWith("$3")) {
                    // view or edit config
                    try {
                        let current_config = await Config.findOne({ about: "STUDENT" });
                        const current_config_str = `1 Add person ${current_config.add_person}\n2 Delete person ${current_config.delete_person}\n3 Add notice ${current_config.add_notice}\n4 Delete notice ${current_config.delete_notice}`;
                        if (message.body.length <= 2) {
                            // user only wants to view config
                            await message.reply("$3_toggle to toggle config\n\nCurrent config is : \n" + current_config_str);
                            console.log("Current config is : \n" + current_config_str);
                        }
                        else if (message.body.length > 2) {
                            // user might want to toggle config
                            if (student_data.iscr == true) {
                                if (message.body === "$3_toggle") {
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
                                    message.reply("Please use $3_toggle to toggle config");
                                }
                            }
                            else {
                                message.reply("Only CR can edit config");
                            }
                        }

                    } catch (error) {
                        console.log("Error in $3 ", error);
                    }
                } else if (message.body.startsWith("$4")) {
                    // list total student data with same sem and department
                    Student.find({ sem: sem, department: department })
                        .then(async students => {
                            let msg = `Total students in sem ${sem} and department ${department} are : \n`;
                            for (const student of students) {
                                msg += student.name + " " + student.number + "\n" + student.rollnumber + "\n";
                            }
                            await message.reply(msg);
                        })
                        .catch(error => {
                            console.error('Error fetching student data:', error);
                        });
                } else if (message.body.startsWith("$5")) {
                    // return list of all assignments
                    const assignments = await findAssignment(sem, department);
                    if (assignments.length == 0) {
                        await message.reply("No pending assignments found");
                    } else {
                        await message.reply("Assignments found");
                        let msg = "";
                        for (const assignment of assignments) {
                            msg += assignment.subject_name + "\n";
                        }
                        await message.reply(msg);
                    }
                }
                else if (message.hasMedia) {
                    // with media students only provide assignment number
                    const subject_name = message.body.toUpperCase();

                    // search for assignment in the database
                    const assignments = await findAssignment(sem, department);
                    if (assignments.length == 0) {
                        await message.reply("No pending assignments found");
                    } else {
                        if (assignments.some(assignment => assignment.subject_name === subject_name)) {
                            try {
                                // Download the media
                                const media = await message.downloadMedia();
                                // doc_name is rollnumber_name_sem_department_subject_name
                                const doc_name = rollnumber + "_" + name + "_" + sem + "_" + department + "_" + subject_name;
                                // Save the media to a file
                                const folder_path = `./uploads/Assignments/${department}/${sem}/${subject_name}`;
                                const filePath = `${folder_path}/${doc_name}.${media.mimetype.split('/')[1]}`;

                                // check if folder exists
                                // if not then reply that, deadline crossed
                                if (!fs.existsSync(folder_path)) {
                                    await message.reply("Deadline crossed");
                                    return;
                                }
                                else {
                                    fs.writeFileSync(filePath, media.data, { encoding: 'base64' });
                                    await message.reply("Assignment uploaded successfully");
                                }

                                console.log(`Media saved to ${filePath}`);
                            } catch (err) {
                                console.error('Failed to download media:', err);
                            }
                            await message.reply("Assignment found");
                        } else {
                            await message.reply("Assignment not found");
                        }
                    }
                } else {
                    let msg = "Please select \n\n$1 for Notice\n\n$2_noticeinfo to add notice(only CR)\n\n$3_To See Student Config\n\n$4 to list total student data int your class\n\n$5 to edit your info";
                    if (message.body !== "$") {
                        msg = "Unable to understand your query\n" + msg;
                    }
                    await message.reply(msg);
                }
            }
            // Handle faculty messages
            else if (person && person.type === "FACULTY") {
                const faculty_data = person.data;
                const faculty_msg = message.body;
                if (message.body == "$") {
                    await message.reply("Please select \n\n$1 to create assignment\n_Syntax : $1_sem_subject_optional msg_\n\n$2 to view assignment status\n_Syntax : $2_assignmentNumber_\n\n$3 to download assignments\n_Syntax : $3_assignmentNumber_\n\n$4 to list all students in your department\n_Syntax : $4_year1_");
                }
                else if (message.body.startsWith("$1")) {
                    // create assignment
                    // syntax : $1_sem_subject_optional_msg
                    try {
                        const [command, sem, subject, ...optionalMsgParts] = message.body.split('_');
                        const optional_msg = optionalMsgParts.join('_');

                        // Validate semester
                        const semNumber = parseInt(sem);
                        if (isNaN(semNumber) || semNumber < 1 || semNumber > 8) {
                            await message.reply("Invalid semester");
                            return;
                        }

                        // Validate subject
                        if (!subject || subject.trim().length === 0) {
                            await message.reply("Invalid subject name.");
                            return;
                        }

                        // Convert subject to uppercase
                        const subjectUpper = subject.trim().toUpperCase();

                        console.log({ sem: semNumber, subject: subjectUpper, optional_msg });

                        // create folder at ./uploads/department/sem/subject_name
                        const folder_path = `./uploads/${faculty_data.department}/${sem}/${subject}`;
                        if (!fs.existsSync(folder_path)) {
                            console.log("New folder created : " + folder_path);
                            fs.mkdirSync(folder_path, { recursive: true });
                        }

                        const assignmentData = {
                            semester: semNumber,
                            given_by: faculty_data.name,
                            department: faculty_data.department,
                            subject_name: subjectUpper,
                            folder_path: folder_path
                        };
                        if (optional_msg) {
                            assignmentData.optional_msg = optional_msg;
                        }


                        await addAssignment(assignmentData);

                    } catch (error) {
                        console.log("Error in $1 ", error);
                    }


                    return;

                    // Example of saving a new assignment with an optional message
                    // folder path is projectdir/uploads/department/sem/subject_name
                    // create folder if not exists
                    const folder_path = `./uploads/${faculty_data.department}/${sem}/${subject}`;
                    if (!fs.existsSync(folder_path)) {
                        console.log("New folder created : " + folder_path);
                        fs.mkdirSync(folder_path, { recursive: true });
                    }

                    // create assignment
                    const newAssignment = new Assignment({
                        semester: sem,
                        given_by: faculty_data.name, // Faculty name
                        department: faculty_data.department,  // Department
                        subject_name: subject, // Subject name
                        folder_path: folder_path, // Existing folder path
                        optional_msg: 'This assignment is to be submitted by next Friday.' // Optional message
                    });
                    try {
                        await newAssignment.save();
                        await message.reply("Assignment created successfully");
                    }
                    catch (error) {
                        await message.reply("Error creating assignment");
                        console.error('Error creating assignment:', error);
                    }

                }
                else if (message.body.startsWith("$2")) {
                    // Assignment status
                    // message.body in this format $3_assignmentNumber
                }
                else if (message.body.startsWith("$3")) {
                    // Download assignments
                    // message.body in this format $3_assignmentNumber
                }
                else if (message.body.startsWith("$3")) {
                    // list all students in his/her department with the given year
                    // message.body in this format $3_year1 (year values range from 1 to 4)
                    // year 1 shows all students of sem 1 and sem 2 and so on like this
                }
            }
            // Not in database
            else if (person == null) {
                // registration portion is completed

                // Register yourself in this format below\n
                // For Faculty: $_role_name_department\n
                // example: $_Faculty_Manjari Saha_CSE\n
                // For Student: $_role_name_department_sem_rollnumber\n
                // example: $_Student_Avronil Banerjee_7_CSE_11000121016";

                // Registrations are closed for both student and faculties
                if (Config.findOne({ about: "STUDENT" }).add_person == false && Config.findOne({ about: "FACULTY" }).add_person == false) {
                    await message.reply("Registration feature is disabled");
                    return;
                }

                const registration_msg = "\n\nYou are not registered in the database\n\n" +
                    "Register yourself in this format below\n\n" +
                    "For Faculty: $_role_name_department\n\n" +
                    "example: $_FACULTY_Manjari Saha_CSE\n\n" +
                    "For Student: $_role_name_department_sem_rollnumber\n\n" +
                    "example: $_STUDENT_Avro Banerjee_CSE_7_11000121016\n\n" +
                    "Departments : (CSE , IT, TT, APM)";
                console.log("message from unknown person " + phone_number);

                try {
                    // Format: $_ROLE_NAME_DEPARTMENT_SEM_ROLLNUMBER (for students)
                    // Format: $_ROLE_NAME_DEPARTMENT (for faculty)
                    const [_, role, name, department, ...remainingParts] = message.body.split('_').map(part => part.toUpperCase());

                    // Validate basic fields
                    if (!role || !name || !department) {
                        throw new Error("Invalid registration format");
                    }

                    if (role === "STUDENT") {
                        const [sem, rollnumber] = remainingParts;
                        if (!sem || !rollnumber) {
                            throw new Error("Invalid student registration format");
                        }
                        console.log({ role, name, department, sem, rollnumber });

                        if (await Config.findOne({ about: "STUDENT" }).add_person === false) {
                            await message.reply("Registration feature is disabled");
                        } else {
                            await addPerson(role, {
                                number: phone_number,
                                name,
                                sem,
                                department,
                                roll: rollnumber,
                                iscr: false
                            });
                            await message.reply(`Hi ${name}\nthank you for registering`);
                        }
                    } else if (role === "FACULTY") {
                        if (remainingParts.length > 0) {
                            throw new Error("Invalid faculty registration format");
                        }
                        console.log({ role, name, department });

                        if (await Config.findOne({ about: "FACULTY" }).add_person === false) {
                            await message.reply("Registration feature is disabled");
                        } else {
                            await addPerson(role, {
                                name,
                                number: phone_number,
                                department,
                                ishod: false
                            });
                            await message.reply(`Hi Prof. ${name}\nthank you for registering`);
                        }
                    } else {
                        throw new Error("Invalid role");
                    }
                } catch (error) {
                    console.log("inside registration catch block \n", error);
                    await message.reply("*Welcome to GCETTS*" + registration_msg);
                }
            }
        }
    }
    catch (error) {
        console.log("error ", error);
    }
});

// Initialize the client
client.initialize();


// // Create configuration for students
// const studentConfig = new Config({
//     about: "Student",
//     add_person: true,
//     delete_person: true,
//     add_notice: true,
//     delete_notice: true
// });

// // Create configuration for faculties
// const facultyConfig = new Config({
//     about: "Faculty",
//     add_person: true,
//     delete_person: true,
//     add_notice: true,
//     delete_notice: true
// });

// // Save to the database
// studentConfig.save()
//     .then(() => console.log("Student configuration saved!"))
//     .catch(err => console.error("Error saving student configuration:", err));

// facultyConfig.save()
//     .then(() => console.log("Faculty configuration saved!"))
//     .catch(err => console.error("Error saving faculty configuration:", err));
