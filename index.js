// Import required modules
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mongoose = require('mongoose');
const moment = require('moment');

// Import models and utility functions
const Student = require('./models/student');
const Faculty = require('./models/faculty');
const Config = require('./models/config');
const Assignment = require('./models/assignment');
const findPerson = require('./services/findPerson');
const addPerson = require('./services/findPerson');
const getNotices = require('./services/getNotices');
const addNotice = require('./services/addNotice');


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
                console.log("Message from : ", student_data.name);
                if (message.body.startsWith("$1")) {
                    // get notice updates
                    try {
                        const notices = await getNotices(student_data.sem, student_data.department);

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
                        const notice_date = moment().format('YYYY-MM-DD');
                        const notice_sem = student_data.sem;
                        const notice_department = student_data.department;
                        const notice_updated_by = student_data.name;
                        const notice_data = {
                            date: notice_date,
                            sem: notice_sem,
                            department: notice_department,
                            info: notice_info,
                            updated_by: notice_updated_by
                        };
                        if (notice_info.length == 0) {
                            await message.reply("Please enter the notice info");
                        } else {
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
                                        await message.reply("System Unlocked by " + student_data.name);
                                    }
                                    else {
                                        await message.reply("System Locked by " + student_data.name);
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
                    Student.find({ sem: student_data.sem, department: student_data.department })
                        .then(async students => {
                            let msg = `Total students in sem ${student_data.sem} and department ${student_data.department} are : \n`;
                            for (const student of students) {
                                msg += student.name + " " + student.number + "\n" + student.rollnumber + "\n";
                            }
                            await message.reply(msg);
                        })
                        .catch(error => {
                            console.error('Error fetching student data:', error);
                        });
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
                    await message.reply("Please select \n\n$1 to create assignment\n\n$2 to view assignment status\n\n$3 to download assignments\n\n$4 to list all students in your department");
                }
                else if (message.body.startsWith("$1")) {
                    // faculty_msg contains semester subject name optional message
                    // in this format $1_sem_subject_optionalMsg
                    const sem = faculty_msg.slice(2, faculty_msg.indexOf('_', 2));
                    const subject = faculty_msg.slice(faculty_msg.indexOf('_', 2) + 1, faculty_msg.indexOf('_', faculty_msg.indexOf('_', 2) + 1));
                    const optional_msg = faculty_msg.slice(faculty_msg.indexOf('_', faculty_msg.indexOf('_', 2) + 1) + 1);
                    const syntax = "$1_sem_subject_optionalMsg";
                    if (!(sem > 1 && sem < 8)) {
                        // check if sem is between 1 to 8
                        await message.reply("Invalid semester\n" + "syntax : " + syntax);
                        return;
                    }
                    if (subject.length < 1) {
                        await message.reply("Please enter the subject name\n" + "syntax : " + syntax);
                        return;
                    }
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

                const registration_msg = "\nYou are not registered in the database\n\n" +
                    "Register yourself in this format below\n\n" +
                    "For Faculty: $_role_name_department\n\n" +
                    "example: $_FACULTY_Manjari Saha_CSE\n\n" +
                    "For Student: $_role_name_department_sem_rollnumber\n\n" +
                    "example: $_STUDENT_Avro Banerjee_CSE_7_11000121016\n\n" +
                    "Departments : (CSE , IT, TT, APM)";
                console.log("message from unknown person ");
                console.log(phone_number);
                try {
                    // taking role
                    const role = message.body.slice(2, message.body.indexOf('_', 2)).toUpperCase();
                    // taking name
                    const name = message.body.slice(message.body.indexOf('_', 2) + 1, message.body.indexOf('_', message.body.indexOf('_', 2) + 1)).toUpperCase();
                    // taking department
                    const department = message.body.slice(message.body.indexOf('_', message.body.indexOf('_', 2) + 1) + 1, message.body.indexOf('_', message.body.indexOf('_', message.body.indexOf('_', 2) + 1) + 1)).toUpperCase();
                    // checking role name department
                    if (role.length < 1 || name.length < 1 || department.length < 1) {
                        throw new Error("Invalid role,name,department provided");
                    }
                    else {
                        console.log(role, name, department);
                    }

                    if (role == "STUDENT") {
                        // taking sem
                        const sem = message.body.slice(message.body.indexOf('_', message.body.indexOf('_', message.body.indexOf('_', 2) + 1) + 1) + 1, message.body.indexOf('_', message.body.indexOf('_', message.body.indexOf('_', message.body.indexOf('_', 2) + 1) + 1) + 1)).toUpperCase();
                        // taking rollnumber
                        const rollnumber = message.body.slice(message.body.indexOf('_', message.body.indexOf('_', message.body.indexOf('_', message.body.indexOf('_', 2) + 1) + 1) + 1) + 1);
                        if (sem.length < 1 || rollnumber.length < 1)
                            throw new Error("Invalid sem,rollnumber provided");
                        else {
                            console.log(sem, rollnumber);
                        }
                        // if registration is closed
                        if (Config.findOne({ about: "STUDENT" }).add_person == false) {
                            // adding student data to database
                            await message.reply("Registration feature is disabled");
                        }
                        else { // registration is open
                            addPerson(role, { number: phone_number, name: name, sem: sem, department: department, roll: rollnumber, iscr: false });

                        }
                        await message.reply("Hi " + name + "\n" + "thank you for registering");
                    }
                    else if (role == "FACULTY") {
                        // if registration is closed
                        if (Config.findOne({ about: "FACULTY" }).add_person == false) {
                            // adding student data to database
                            await message.reply("Registration feature is disabled");
                        }
                        else { // registration is open
                            addPerson("FACULTY", { name: name, number: phone_number, department: department, ishod: false });

                        }
                        await message.reply("Hi Prof. " + name + "\n" + "thank you for registering");
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
