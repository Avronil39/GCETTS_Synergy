const express = require('express'); // Web framework for handling HTTP requests
const session = require('express-session'); // Session management for user sessions
const bodyParser = require('body-parser'); // Middleware to parse incoming request bodies

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

// get at /
app.get("/", (req, res) => {
    // if not logged in 
    if (!req.session.isLoggedin) {
        return res.redirect("/login");
    }
    // user is already logged in
    const mobile_number = req.session.mobile_number;
    const person_type = req.session.person_type;
    // search all his assignments
    // list assignment names
    // search all submissions for each assignment name
    // render that to the front end
    return res.render("faculty.ejs");
})
// get at /login
app.get("/login", (req, res) => {
    if (req.session.isLoggedin) {
        return res.redirect("/");
    }
    return res.sendFile("public/login.html", { root: __dirname }); // placed in /public
})
// post at /send-otp
app.post("/send-otp", (req, res) => {
    const { mobile } = req.body;
    req.session.phone_number = mobile;
    req.session.generatedOtp = "123456";
    res.json({ message: "otp sent" });
})
// post  at /verify-otp
app.post("/verify-otp", (req, res) => {
    const { mobile, otp } = req.body;
    console.log(`at verify-otp req mobile ${mobile} and req otp ${otp}`);
    console.log(`at verify-otp session mobile ${req.session.phone_number} and session otp ${req.session.generatedOtp}`);

    if (req.session.phone_number === mobile &&
        req.session.generatedOtp === otp) {
        // verified
        console.log("Verified\n");
        req.session.isLoggedin = true;
        delete req.session.generatedOtp;
        return res.json({ message: "Successful" });
    }
    else {
        res.json({ message: "Failed" });
    }
})

// app.post("/verify-otp", (req, res) => {
//     const { mobile, otp } = req.body;
//     console.log(`At verify-otp: req mobile ${mobile} and req otp ${otp}`);
//     console.log(`At verify-otp: session mobile ${req.session.phone_number} and session otp ${req.session.generatedOtp}`);

//     if (req.session.phone_number === mobile && req.session.generatedOtp === otp) {
//         // Verified
//         console.log("Verified");

//         req.session.isLoggedin = true;
//         delete req.session.generatedOtp;

//         // Ensure session is saved before redirecting
//         req.session.save((err) => {
//             if (err) {
//                 console.log("Session save error:", err);
//                 return res.json({ message: "Session save error" });
//             }
//             // Send a response indicating success
//             // return res.json({ message: "OTP verified, redirecting..." });
//             res.redirect("/");
//         });
//     } else {
//         res.json({ message: "Wrong number or OTP" });
//     }
// });