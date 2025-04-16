// Import Dependencies
import fetch from 'node-fetch'; /* let to make HTTP requests */
import dotenv from 'dotenv';    /* loads .env file */
import express from 'express';  /* framework to easily build APIs in Node.js. */
import cors from 'cors';        /* allows frontend (browser) to access backend from a different origin(ports) */
import { marked } from "marked";  /* for handle markdown in replies */
import sanitizeHtml from 'sanitize-html'; /* for prevents XSS by cleaning unsafe HTML, such as from Markdown rendering */
import multer from 'multer';  /* for image handling */

// Load .env Variables
dotenv.config();

// Setup Express App
const app = express();
app.use(cors());
app.use(express.json());

// Setup multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Gemini Config
const API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;  

// Chat History
const chatHistoryStore = [];

// Endpoint to handle message and optional file
app.post('/api/chat', upload.single('file'), async (req, res) => {
    const userMessage = req.body.message;
    const file = req.file;

    const parts = [{ text: userMessage }];
    if (file) {
        parts.push({
            inline_data: {
                mime_type: file.mimetype,
                data: file.buffer.toString('base64') // Convert Buffer to base64
            }
        });
    }

    // For chatHistory - Store full message sent to Gemini
    // const geminiInput = { parts };
    chatHistoryStore.push({ role: 'user', parts });

    try {
        // Send Message to Gemini API
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: chatHistoryStore }) // Send full chat history to gemini
        });

        // Handle Gemini API Response
        const geminiResponse  = await response.json();
        
        // If the response was NOT OK, handle error first
        if (!response.ok) {
            const errorMsg = geminiResponse?.error?.message || "Unknown error from Gemini API";
            throw new Error(errorMsg);
        }
        
        // Safe parsing of Gemini response
        const reply = geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || "No reply";

        // Convert markdown to HTML
        const rawHtml = marked(reply);

        // Sanitize the HTML 
        const formattedReply = sanitizeHtml(rawHtml, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
            allowedAttributes: {
                ...sanitizeHtml.defaults.allowedAttributes,
                img: ['src', 'alt'],
            }
        });

        // For chatHistory - Store full message sent by Gemini
        // const geminiOutput = { parts: [{ text: reply }] };
        chatHistoryStore.push({ role: 'model', parts: [{ text: reply }] });

        // console.log("Chat History:", JSON.stringify(chatHistoryStore));

        // Send Back Response to Frontend
        res.json({ formattedReply });
    } catch (err) {
        console.error("API Error:", err);
        res.status(500).json({ error: "Something went wrong." });
    }
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 
