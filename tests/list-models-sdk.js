const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    try {
        console.log("Listing models via SDK...");
        // Note: The SDK itself doesn't have a direct 'listModels' that is commonly used 
        // in simple scripts, so we use the lower-level API if available or just try common ones.
        // Actually, let's use the fetch method again but more robustly.

        const API_KEY = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("Error from API:", data.error);
            return;
        }

        console.log("Available models:");
        data.models.forEach(m => {
            if (m.supportedGenerationMethods.includes('generateContent')) {
                console.log(`- ${m.name} (supports generateContent)`);
            }
        });
    } catch (err) {
        console.error("Failed to list models:", err);
    }
}

listModels();
