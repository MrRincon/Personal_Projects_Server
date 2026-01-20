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
const PR_ROUTER = require('./routers/personalResume_Router.js');
const SS_ROUTER = require('./routers/slotScholars_Router.js');

// Port configuration
const PORT = process.env.PORT || 3000;
// Initialize Express application
const app = express();

// First Middleware to log HTTP requests
app.use(morgan('short'));

// Extra Middleware to allow Cross-Origin Resource Sharing
app.use(cors());

// Second Middleware to serve static files (images, etc.)
let assetsPRPath = path.join(__dirname, './assets/personalResumeImages');
app.use(express.static(assetsPRPath));

let assetsSSPath = path.join(__dirname, './assets/slotScholarsImages');
app.use(express.static(assetsSSPath));

// async function to connect to MongoDB databases
(async () => {
    try {
        await personalResumeConnectDB();
        console.log('Connected to Personal Resume MongoDB database successfully.');
        await slotScholarsConnectDB();
        console.log('Connected to Slot Scholars MongoDB database successfully.');
        
        // Middleware to parse JSON request bodies
        app.use(PR_ROUTER);
        app.use(SS_ROUTER);

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