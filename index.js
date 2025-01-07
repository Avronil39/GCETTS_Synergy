// Import required modules
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mongoose = require('mongoose');
const moment = require('moment');  // If you are using moment.js for date formatting

const Student = require('./models/student');  // Import the Student model
const Faculty = require('./models/faculty');  // Import the Faculty model
const findPersonByNumber = require('./findPerson');  // Import the function from 
const addPerson = require('./addPerson');
const getNotices = require('./getNotices');
const addNotice = require('./addNotice');


// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/gcetts', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB...', err));

// Initialize the WhatsApp client with local authentication
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: 'Auth' // Path where authentication data will be stored
    })
});

// Event listener for when the client is ready
client.on('ready', () => {
    // console.clear(); // Clear console when ready
    console.log('Client is ready!'); // Log that the client is ready
});

// Event listener for generating QR code for authentication
client.on('qr', qr => {
    qrcode.generate(qr, { small: true }); // Generate and display QR code in terminal
});

// Initialize the WhatsApp client
client.initialize();

// Event listener for incoming messages
client.on('message_create', async message => {
    try {
        if (message.id.fromMe == false &&
            message.id.remote.endsWith('@c.us') &&
            message.body.startsWith('$')) {
            // if incoming, chat, starts with $
            const phone_number = message.from.slice(2, 12);
            const person = await findPersonByNumber(phone_number);
            // if student
            if (person && person.type === "Student") {
                const student_data = person.data;
                const student_msg = message.body.slice(1);
                if (student_msg === "1") {
                    // get notice updates
                    // const sem = 3;  // Example semester
                    // const department = 'Computer Science';  // Example department
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

                } else if (student_msg === "2") {
                    // Handle case when student_msg is "2"
                    // get exam updates
                } else if (student_msg === "3") {
                    // Handle case when student_msg is "3"
                    // get placement updates

                } else if (student_msg === "4") {
                    // Handle case when student_msg is "4"
                    // add notice
                    if (student_data.iscr == true) {
                        await message.reply("Under development");
                    }
                    else {
                        await message.reply("You are not authorized to do this");
                    }
                } else if (student_msg === "5") {
                    // Handle case when student_msg is "4"
                    // add student
                    if (student_data.iscr == true) {
                        await message.reply("Under development");
                    }
                    else {
                        await message.reply("You are not authorized to do this");
                    }
                } else {
                    let msg = "Please select \n$1 for Notice\n$2 for exam Update\n$3 for placement Update\n";
                    if (student_msg !== "") {
                        msg = "Unable to understand your query\n" + msg;
                    }
                    if (student_data.iscr == true || true) {
                        msg += "$4 to add notice(only CR)\n";
                        msg += "$5 to add student(only CR)\n";
                    }
                    await message.reply(msg);
                }
            }
            // if faculty
            else if (person && person.type === "Faculty") {
                const faculty_data = person.data;
                const faculty_msg = message.body.slice(1);
                const msg = "Respected " + person.data.name + "\nWelcome to GCETTS Helper bot" + "\nChatbot under development !";
                await message.reply(msg);
            }
            else {
                // not in database
                // ignore
                console.log("incoming text from neither student nor faculty\n");
            }
        }
    }
    catch (error) {
        console.log("error ", error);
    }
});

// const role = 'Student';  // Example role
// const data = {
//   number: '9674910765',
//   name: 'Maa',
//   sem: 7,                // Example semester
//   department: 'CSE',
//   iscr: true             // Example whether the student is registered
// };

// addPerson(role, data);

// Example data to add a notice
// const noticeData = {
//     date: new Date(),              // Current date
//     sem: 7,                        // Example semester
//     department: 'CSE', // Example department
//     info: 'Project Presentation 23th jan 2025' // Example notice information
// };

// Call the function to add the notice
// addNotice(noticeData);