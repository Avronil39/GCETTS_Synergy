// Import required modules
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mongoose = require('mongoose');
const Student = require('./models/student');  // Import the Student model
const Faculty = require('./models/faculty');  // Import the Faculty model
const findPersonByNumber = require('./findPerson');  // Import the function from findPerson.js

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
    if (message.id.fromMe == true) {
        // own message, just ignore
    }
    else if (message.id.remote.endsWith('@g.us')) {
        // Check if the message is from a group chat
        // group chat, ignore
        // console.log('This is a group chat.');
        // Add code here to handle group chat messages (if needed)
    }
    else if (message.id.remote.endsWith('@c.us') && message.id.fromMe == false) {
        // Check if the message is from a personal chat
        console.log('This is a personal chat.');
        const phone_number = message.from.slice(2, 12);
        console.log(phone_number);
        findPersonByNumber(phone_number)
            .then(async person => {
                if (person && person.type === "Student") {
                    console.log(person.data.name);
                    console.log(person.data.sem);
                    console.log(person.data.department);
                    console.log(typeof person.data.name);
                    const msg = "Hi " + person.data.name + "\nSem " + person.data.sem + "\nDepartment " + person.data.department + "\nData retrived from db" + "\nChatbot under development !";
                    await message.reply(msg);
                }
                else if (person && person.type === "Faculty") {
                    const msg = "Respected " + person.data.name + "\nWelcome to GCETTS Helper bot" + "\nChatbot under development !";
                    await message.reply(msg);
                }
                else {
                    // ignore
                    // unknown
                }
            })
            .catch(err => {
                // Handle the error if needed
                console.log('Error ', err);
            });

        // if (message.body.startsWith('$')) {
        //     await message.reply('Hi, ');
        //     await message.reply('AI Model is not ready to assist you');
        // }
    }
    else if (message.from === "status@broadcast") {
        // status update, ignore
        // console.log('new status');
    }
    else {
        // unknown, ignore
        // console.log('Unknown chat type. ');
        // console.log(message.from);
    }
});


// example code to add students and faculties
// Insert data into the "students" collection
// const student = new Student({
//     number: "8697373665",
//     name: "Avronil Banerjee",
//     sem: 7,
//     department: "CSE",
//     iscr: false
// });

// student.save()
//     .then(() => console.log(`Student : ${student.name} data added successfully`))
//     .catch(err => console.error('Error adding student data', err, "\n*****************************"));

// Insert data into the "faculty" collection
// const faculty = new Faculty({
//     number: "F12345",
//     name: "Dr. John Doe",
//     department: "CSE",
//     ishod: true  // Example ishod value
// });

// faculty.save()
//     .then(() => console.log('Faculty data added successfully'))
//     .catch(err => console.error('Error adding faculty data', err));