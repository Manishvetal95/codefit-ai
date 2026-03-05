const dotenv = require("dotenv");

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function listModels() {
    try {
        console.log(`Querying: ${URL.replace(API_KEY, "HIDDEN_KEY")}`);
        const response = await fetch(URL);
        const data = await response.json();

        if (data.error) {
            console.error("API Error:", data.error);
            return;
        }

        if (data.models) {
            console.log("\nAvailable Models:");
            data.models.forEach(m => {
                const methods = m.supportedGenerationMethods || [];
                if (methods.includes('generateContent')) {
                    console.log(`- ${m.name} [SUPPORTS GENERATE]`);
                } else {
                    // console.log(`- ${m.name} (Skipped: ${methods.join(', ')})`);
                }
            });
        } else {
            console.log("No models found in response:", data);
        }
    } catch (error) {
        console.error("Network Error:", error);
    }
}

listModels();
