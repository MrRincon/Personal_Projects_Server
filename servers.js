// Importing the necessary modules
// Express framework to build the server
// Morgan middleware for logging HTTP requests
// CORS middleware to enable Cross-Origin Resource Sharing
// Path module to handle file and directory path
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');

// MongoDB Connections 
const { personalResumeConnectDB, slotScholarsConnectDB } = require('./mongoServers.js');
const PR_ROUTES = require('./routes/personalResume_Routes.js');
const SS_ROUTES = require('./routes/slotScholars_Routes.js');

// Port configuration
const PORT = process.env.PORT || 3000;
// Initialize Express application
const app = express();

// First Middleware to log HTTP requests
app.use(morgan('short'));

// Extra Middleware to allow Cross-Origin Resource Sharing
app.use(cors());

// Second Middleware to serve static files (images, etc.)
let imagePath = path.join(__dirname, './images');
app.use(express.static(imagePath));

let imageSSPath = path.join(__dirname, './slotScholarsImages');
app.use(express.static(imageSSPath));

// async function to connect to MongoDB databases
(async () => {
    try {
        await personalResumeConnectDB();
        console.log('Connected to Personal Resume MongoDB database successfully.');
        await slotScholarsConnectDB();
        console.log('Connected to Slot Scholars MongoDB database successfully.');
        
        // Middleware to parse JSON request bodies
        app.use(PR_ROUTES);
        app.use(SS_ROUTES);

        // Third Middleware to handle 404 errors
        app.use(function (req, res) {
            res.status(404).send(`${res.statusCode} - Resource Not Found at ${PORT}`);
        });

        // Start the server and listen on the specified port
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Error connecting to MongoDB databases:', error);
        process.exit(1);
    }
})();