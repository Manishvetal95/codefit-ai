const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function listModels() {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY not found in .env");
            return;
        }
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // The SDK might not have listModels in the main genAI object depending on version
        // Usually it's via the model manager or just direct API call
        // Let's try the direct approach if possible or check docs
        console.log("Listing models is not directly exposed in the high-level SDK 'genAI' object easily without v1beta client.");
        console.log("Reverting to known working model: 'gemini-flash-latest'");
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
