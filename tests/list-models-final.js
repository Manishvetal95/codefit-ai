const https = require('https');
const fs = require('fs');
const path = require('path');

// Try to read API key from server/.env manually to avoid 'dotenv' dependency
let apiKey = '';
try {
    const envPath = path.join(__dirname, '../server/.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/GEMINI_API_KEY\s*=\s*(.*)/);
    if (match && match[1]) {
        apiKey = match[1].trim();
    }
} catch (err) {
    console.error("Could not read .env file at ../server/.env");
}

if (!apiKey) {
    console.error("API Key not found. Please ensure GEMINI_API_KEY is set in server/.env");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log("Fetching available models from Gemini API...");

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("API Error:", json.error.message);
                return;
            }
            if (json.models) {
                console.log("\n✅ MODELS FOUND:");
                json.models.forEach(m => {
                    if (m.supportedGenerationMethods.includes('generateContent')) {
                        console.log(`- ${m.name.replace('models/', '')}`);
                    }
                });
                console.log("\nNote: Use one of these names exactly in your code.");
            } else {
                console.log("No models returned. Response:", data);
            }
        } catch (e) {
            console.error("Failed to parse response:", e.message);
            console.log("Raw Response:", data);
        }
    });
}).on('error', (err) => {
    console.error("Network Error:", err.message);
});
