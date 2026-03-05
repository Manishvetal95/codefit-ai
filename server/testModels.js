const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    try {
        // For now there isn't a direct helper in the high-level SDK for listModels in quite the same way as the REST API, 
        // but we can try to use a specific model or just check if the key works.
        // Actually, the SDK *does* likely support it if we look at the error message, but simpler might be to just try 'gemini-1.5-flash-latest' or 'gemini-1.0-pro'
        // Let's try to just test a simple generation with a few candidates.

        // Valid models often used:
        const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro", "gemini-pro"];

        console.log("Testing models...");

        for (const modelName of modelsToTry) {
            console.log(`\nAttemping to use model: ${modelName}`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello, are you there?");
                const response = await result.response;
                console.log(`✅ SUCCESS: ${modelName} worked! Response: ${response.text()}`);
                return; // We found a working one
            } catch (error) {
                console.log(`❌ FAILED: ${modelName}`);
                // console.log(error.message); 
            }
        }

        console.log("\nNo models worked. Please check your API Key / Quota.");

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
