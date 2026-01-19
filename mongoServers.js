// Importing the MongoDB client
const { MongoClient, ServerApiVersion } = require('mongodb');

// Creating Connection URIs for two different databases with encoded root and password#
const personalResumeURI = process.env.PERSONAL_RESUME_URI;
const personalResumeDBName = process.env.PERSONAL_RESUME_DBNAME;
const slotScholarsURI = process.env.SLOT_SCHOLARS_URI;
const slotScholarsDBName = process.env.SLOT_SCHOLARS_DBNAME;

if (!personalResumeURI) {
    console.error('Error: PERSONAL_RESUME_URI is not defined in environment variables.');
    process.exit(1);
}
if (!personalResumeDBName) {
    console.error('Error: PERSONAL_RESUME_DBNAME is not defined in environment variables.');
    process.exit(1);
}
if (!slotScholarsURI) {
    console.error('Error: SLOT_SCHOLARS_URI is not defined in environment variables.');
    process.exit(1);
}
if (!slotScholarsDBName) {
    console.error('Error: SLOT_SCHOLARS_DBNAME is not defined in environment variables.');
    process.exit(1);
}

// Setting up MongoDB clients for both databases
const personalResumeClient = new MongoClient(personalResumeURI, {
    serverApi: ServerApiVersion.v1,
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
    minPoolSize: 10,
    maxPoolSize: 100
});
let personalResumeDB;

const slotScholarsClient = new MongoClient(slotScholarsURI, {
    serverApi: ServerApiVersion.v1,
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
    minPoolSize: 10,
    maxPoolSize: 100
});
let slotScholarsDB;

// Function to connect to the Personal Resume MongoDB database
async function personalResumeConnectDB() {
    if (personalResumeDB) {
        console.log('Personal Resume database is already connected.');
        return personalResumeDB;
    }

    try {
        await personalResumeClient.connect();
        console.log('Connected to Personal Resume MongoDB database.');
        personalResumeDB = personalResumeClient.db(personalResumeDBName);
        return personalResumeDB;
    } catch (error) {
        console.error (`Failed to connect to Personal Resume database: ${error}`);
        throw error;
    }
}

// Accessing Personal Resume collections
function getPRCollection () {
    if (!personalResumeDB) {
        throw new Error('Personal Resume database is not connected.');
    }
    return {
        // Collections
    };
}

// Function to connect to the Slot Scholars MongoDB database
async function slotScholarsConnectDB() {
    if (slotScholarsDB) {
        console.log('Slot Scholars database is already connected.');
        return slotScholarsDB;
    }

    try {
        await slotScholarsClient.connect();
        console.log('Connected to Slot Scholars MongoDB database.');
        slotScholarsDB = slotScholarsClient.db(slotScholarsDBName);

        return slotScholarsDB;
    } catch (error) {
        console.error (`Failed to connect to Slot Scholars database: ${error}`);

        throw error;
    }
}

// Accessing Slot Scholars collections
function getSSCollection () {
    if (!slotScholarsDB) {
        throw new Error('Slot Scholars database is not connected.');
    }
    return {
        // Collections
        productsCollection: slotScholarsDB.collection("Products"),
        ordersCollection: slotScholarsDB.collection("Orders")
    };
}

// Exporting the connection functions and collection accessors
module.exports = {
    personalResumeConnectDB,
    getPRCollection,
    slotScholarsConnectDB,
    getSSCollection
};