// Import the necessary modules
// Express framework to build the server#
// Body-parser middleware to parse incoming request bodies
// Nodemailer module to send emails
// Node-fetch module to make HTTP requests
// Crypto module for generating random IDs
const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const crypto = require("crypto");

// Import collections from mongoDB server
const { getPRCollection } = require('../mongoServers.js');

const PR_ROUTES = express();
PR_ROUTES.use(bodyParser.json());
PR_ROUTES.set('json spaces', 3);

// Importing the ObjectId to work with MongoDB doc IDs
const { ObjectId } = require('mongodb');

// Configuring nodemailer transporter to send emails via Gmail
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Incorporating encryption
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16; // For AES, this is always 16

// Function for a notification for every new message
async function sendNotificationEmail(toEmail, fromName, fromEmail, messageContent) {
    const mailOptions = {
        from: `"Personal Resume Inbox" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `New message from ${fromName}`,
        text: `You have received a new message.\n\nFrom: ${fromName} <${fromEmail}>\n\nMessage:\n${messageContent}`,
        html: `<p>You have received a new message.</p>
           <p><strong>From:</strong> ${fromName} &lt;${fromEmail}&gt;</p>
           <p><strong>Message:</strong><br>${messageContent.replace(/\n/g, "<br>")}</p>`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Notification email sent!");
    } catch (error) {
        console.error("Failed to send notification email:", error);
    }
}

// Function for data encryption
function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY, "hex"), iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
}

// Function for data decryption
function decrypt(text) {
    const [ivHex, encryptedText] = text.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedText, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY, "hex"), iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}

// Function to get any sub-collection for a user
async function getUserSubCollection(req, res, field, collection) {
    const { userCollection } = getPRCollection();
    const { userId } = req.params;

    if (!ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    try {
        const user = await userCollection.findOne({ _id: new ObjectId(userId) });

        if (!user || !Array.isArray(user[field]) || user[field].length === 0) {
            return res.json([]);
        }

        const items = await collection.find({ _id: { $in: user[field] } }).toArray();
        return res.json(items);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: `Error retrieving ${field} for the user: ${error}`,
        });
    }
}

// Validating the email with Abstract API
async function isEmailValidAbstract(email) {
    const apiKey = process.env.ABSTRACT_API_KEY;
    const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodeURIComponent(email)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        return (
            data.deliverability === "DELIVERABLE" &&
            data.is_valid_format?.value &&
            !data.is_disposable_email?.value &&
            !data.is_role_email?.value &&
            data.is_smtp_valid?.value
        );
    } catch (error) {
        console.error("Email verification API error:", error);
        return false;
    }
}

// GET to the server welcome page
PR_ROUTES.get(`/`, (req, res) => {
    res.send("Welcome to the server side of my resume");
});

// GET for the owner information
PR_ROUTES.get(`/Owner`, async (req, res) => {
    const { userCollection } = getPRCollection();
    try {
        const owner = await userCollection.find({ name: "Alam" }).toArray();

        if (owner.length === 0) {
            return res.status(404).json({ success: false, message: "Owner not found" });
        }

        const modifiedOwner = owner.map(user => {
            if (user.contact && user.contact.email) {
                return {
                    ...user,
                    contact: {
                        ...user.contact,
                        email: encrypt(user.contact.email),
                    }
                };
            }
            return user;
        });

        res.json(modifiedOwner);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: `Error getting the owner of this webpage with internal server: ${error}`,
        });
    }
});

// GET for all the links related to the user
PR_ROUTES.get("/Links/:userId", (req, res) => {
    const { linksCollection } = getPRCollection();
    return getUserSubCollection(req, res, "links", linksCollection);
});

// GET for an specific education of the user
PR_ROUTES.get(`/Education/:educationId`, async (req, res) => {
    const { educationCollection } = getPRCollection();
    if (!ObjectId.isValid(req.params.educationId)) {
        return res.status(400).json({ success: false, message: "Invalid user ID" });
    }
    const educationId = new ObjectId(req.params.educationId);

    try {
        const education = await educationCollection.findOne({ _id: educationId });

        if (!education) {
            return res.status(404).json({ success: false, message: "Education not found" });
        };

        res.json(education);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: `Error getting the education with internal server: ${error}`,
        });
    }
});

// GET for all the skills related to the user
PR_ROUTES.get("/Skills/:userId", (req, res) => {
    const { skillsCollection } = getPRCollection();
    return getUserSubCollection(req, res, "skills", skillsCollection);
});

// GET for all the projects related to the user
PR_ROUTES.get("/Projects/:userId", (req, res) => {
    const { projectsCollection } = getPRCollection();
    return getUserSubCollection(req, res, "projects", projectsCollection);
});

// POST to send a direct message to the user
PR_ROUTES.post('/SendNewMessage', async (req, res) => {
    const { userCollection, messagesCollection } = getPRCollection();
    try {
        const { userId, name, email, message } = req.body;

        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }
        if (!name || !email || !message) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const trimmedName = name.trim();
        const nameHasNumbers = /\d/.test(trimmedName);
        const nameParts = trimmedName.split(" ").filter(Boolean);
        const emailRegexCheck = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/.test(email);
        const isValidEmail = await isEmailValidAbstract(email);
        const trimmedMessage = message.trim();

        if (!trimmedName) {
            return res.status(400).json({ error: "Full name is required." });
        }
        if (nameHasNumbers) {
            return res.status(400).json({ error: "Name cannot contain numbers." });
        }
        if (nameParts.length < 2) {
            return res.status(400).json({ error: "Please enter both first name and surname." });
        }
        if (trimmedName.length > 50) {
            return res.status(400).json({ error: "Full name cannot exceed 50 characters." });
        }
        if (nameParts.some(part => part.length > 25)) {
            return res.status(400).json({ error: "Each part of the name must be 25 characters or less." });
        }
        if (!emailRegexCheck) {
            return res.status(400).json({ error: "Invalid email address." });
        }
        if (!isValidEmail) {
            return res.status(400).json({ error: "This email address does not appear to be deliverable." });
        }
        if (!trimmedMessage) {
            return res.status(400).json({ error: "Message cannot be empty." });
        }
        if (trimmedMessage.length > 300) {
            return res.status(400).json({ error: "Message cannot exceed 300 characters." });
        }

        const user = await userCollection.findOne({ _id: new ObjectId(userId) });

        if (!user || !Array.isArray(user.inbox)) {
            return res.status(404).json({ error: "User ID not found or inbox structure not present" })
        }

        const newMessage = {
            fromName: trimmedName,
            fromEmail: email,
            content: trimmedMessage,
            date: new Date()
        };

        const insertResponse = await messagesCollection.insertOne(newMessage);
        const messageId = insertResponse.insertedId;

        await userCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $push: { inbox: messageId } }
        );

        await sendNotificationEmail(
            user.contact.email,
            newMessage.fromName,
            newMessage.fromEmail,
            newMessage.content
        );

        return res.status(200).json({ message: "Message sent successfully." });

    } catch (error) {
        console.error("Error sending a new message to user:", error);
        return res.status(500).json({ error });
    }
});

module.exports = PR_ROUTES; // Export all the functions