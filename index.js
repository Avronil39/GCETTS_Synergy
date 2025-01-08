// Import required modules
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mongoose = require('mongoose');
const moment = require('moment');

// Import models and utility functions
const Student = require('./models/student');
const Faculty = require('./models/faculty');
const findPerson = require('./findPerson');
const addPerson = require('./addPerson');
const getNotices = require('./getNotices');
const addNotice = require('./addNotice');
const Config = require('./models/config');

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
            if (person && person.type === "Student") {
                // return statement added because i want to debug person==null portion
                return;

                // await message.reply("Hi "+person.data.name);
                const student_data = person.data;
                if (message.body.startsWith("$1")) {
                    // get notice updates
                    getNotices(student_data.sem, student_data.department)
                        .then(async notices => {
                            if (notices.length === 0) {
                                console.log('No notice available');  // If no notices found
                                await message.reply("No notice in the last 30 days.");
                            } else {
                                console.log('Loading notices from the last 30 days...');
                                await message.reply("Loading notices from the last 30 days...");

                                // Use for...of loop for async/await to work properly
                                for (const notice of notices) {
                                    const formattedDate = moment(notice.date).format('YYYY-MM-DD');  // Format the date
                                    const temp_notice_info = `Notice Date: ${formattedDate}\n Info: ${notice.info}`;

                                    // Reply with the formatted notice information
                                    await message.reply(temp_notice_info);
                                    console.log(temp_notice_info);
                                }
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching notice:', error);  // Handle any errors
                        });

                } else if (message.body.startsWith("$2")) {
                    // add notice
                    if (student_data.iscr == true) {
                        const notice_info = message.body.slice(3);
                        const notice_date = moment().format('YYYY-MM-DD');
                        const notice_sem = student_data.sem;
                        const notice_department = student_data.department;
                        const notice_data = {
                            date: notice_date,
                            sem: notice_sem,
                            department: notice_department,
                            info: notice_info
                        };
                        if (notice_info.length == 0) {
                            await message.reply("Please enter the notice info");
                        } else {
                            addNotice(notice_data)
                                .then(async () => {
                                    await message.reply("Notice added successfully");
                                })
                                .catch(error => {
                                    console.error('Error adding notice:', error);
                                });
                        }
                    }
                    else {
                        await message.reply("You are not authorized to do this");
                    }
                } else if (message.body.startsWith("$3")) {
                    // add student
                    if (student_data.iscr == true) { // only CR can add student
                        // the message.body should be in this format $3_Studentname_number
                        // input student is never a cr, cr data is already in database
                        try {
                            let input_student_name = message.body.slice(3, message.body.indexOf('_', 3));
                            let input_student_number = message.body.slice(message.body.indexOf('_', 3) + 1);
                            if (input_student_number.length > 10) {
                                // take last 10 digits
                                input_student_number = input_student_number.slice(-10);
                            }
                            if (input_student_number.length < 10 || input_student_name.length == 0) {
                                throw new Error("Invalid info");
                            }
                            const input_student_data = {
                                name: input_student_name,
                                number: input_student_number,
                                sem: student_data.sem,
                                department: student_data.department,
                                iscr: false
                            };
                            addPerson("Student", input_student_data);
                        }
                        catch (error) {
                            console.log("Error in adding student ", error);
                            await message.reply("Enter info like : $3_Studentname_number");
                        }
                    }
                    else {
                        await message.reply("You are not authorized to do this");
                    }
                } else if (message.body.startsWith("$4")) {
                    // list total student data with same sem and department
                    Student.find({ sem: student_data.sem, department: student_data.department })
                        .then(async students => {
                            let msg = "Total students in this sem and department are : \n";
                            for (const student of students) {
                                msg += student.name + " " + student.number + "\n";
                            }
                            await message.reply(msg);
                        })
                        .catch(error => {
                            console.error('Error fetching student data:', error);
                        });
                } else {
                    let msg = "Please select \n$1 for Notice\n$2_noticeinfo to add notice(only CR)\n$3_Name_Number to add student(only CR)\n$4 to list total student data int your class";
                    if (message.body !== "$") {
                        msg = "Unable to understand your query\n" + msg;
                    }
                    await message.reply(msg);
                }
            }
            // Handle faculty messages
            else if (person && person.type === "Faculty") {
                // return statement added because i want to debug person==null portion
                return;


                // message.reply("Hi Professor "+person.data.name);
                const faculty_data = person.data;
                const faculty_msg = message.body.slice(1);
                const msg = "Respected " + person.data.name + "\nWelcome to GCETTS Helper bot" + "\nChatbot under development !";
                await message.reply(msg);
            }
            // Not in database
            else if (person == null) {
                // Register yourself in this format below\n
                // For Faculty: $_role_name_department\n
                // example: $_Faculty_Manjari Saha_CSE\n
                // For Student: $_role_name_department_sem_rollnumber\n
                // example: $_Student_Avronil Banerjee_7_CSE_11000121016";
                const registration_msg = "\nYou are not registered in the database\n" +
                    "Register yourself in this format below\n\n" +
                    "For Faculty: $_role_name_department\n" +
                    "example: $_Faculty_Manjari Saha_CSE\n\n" +
                    "For Student: $_role_name_department_sem_rollnumber\n" +
                    "example: $_Student_Avronil Banerjee_CSE_7_11000121016";
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
                        // adding student data to database
                        addPerson(role, { number: phone_number, name: name, sem: sem, department: department, roll: rollnumber, iscr: false });
                    }
                    else if (role == "FACULTY") {
                        addPerson("FACULTY", { name: name, number: phone_number, department: department, ishod: false });
                    }
                    await message.reply("Hi " + name + "\n" + "thank you for registering");
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
