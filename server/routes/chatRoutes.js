const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Chat = require('../models/Chat');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../config/multer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();

const MODEL_FALLBACKS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-flash-latest", "gemini-pro-latest"];
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");

// Helper to encode file to base64
function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: fs.readFileSync(path).toString("base64"),
            mimeType,
        },
    };
}

// Helper for Gemini API calls with Exponential Backoff
async function callGeminiWithRetry(chatSession, parts, maxRetries = 5) {
    let delay = 3000; // Start with 3 seconds
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await chatSession.sendMessage(parts);
            return result;
        } catch (error) {
            const is503 = error.status === 503 || error.message.includes('503 Service Unavailable') || error.message.includes('high demand');
            const is429 = error.status === 429 || error.message.includes('429 Too Many Requests') || error.message.includes('Quota exceeded');

            if ((is503 || is429) && i < maxRetries - 1) {
                let currentDelay = delay;

                // Check if 429 is a "Daily" quota error - if so, don't wait, just fail so we can fallback
                const isDailyQuota = error.message.includes('PerDay') || error.message.includes('Daily') || error.message.includes('limit: 0');
                if (is429 && isDailyQuota) {
                    console.log(`[AI] Daily Quota reached for this model. Failing fast to fallback...`);
                    throw error;
                }

                // If 429, try to extract retryDelay from the error response
                if (is429 && error.response && error.response.retryDelay) {
                    // usually format is '36s' or seconds as number
                    const suggestedDelay = parseFloat(error.response.retryDelay);
                    if (!isNaN(suggestedDelay)) {
                        currentDelay = (suggestedDelay + 2) * 1000; // Add 2s buffer and convert to ms
                        console.log(`429 Quota Exceeded. Gemini requested ${suggestedDelay}s wait. Waiting ${currentDelay}ms...`);
                    }
                } else if (is429 && error.message.includes('retry in')) {
                    // fallback: parse from message "Please retry in 36.528218234s"
                    const match = error.message.match(/retry in ([\d.]+)s/);
                    if (match && match[1]) {
                        currentDelay = (parseFloat(match[1]) + 2) * 1000;
                        console.log(`429 Quota Exceeded (Parsed from msg). Waiting ${currentDelay}ms...`);
                    }
                }

                console.log(`Gemini API ${is429 ? 'Rate Limited' : 'Busy'} (Attempt ${i + 1}/${maxRetries}). Retrying in ${currentDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, currentDelay));

                // If we didn't use a specific suggested delay, grow exponentially
                if (currentDelay === delay) {
                    delay *= 2;
                }
                continue;
            }
            throw error; // Re-throw if not retryable or max retries reached
        }
    }
}

// Get all chats for a user
router.get('/', protect, async (req, res) => {
    try {
        const chats = await Chat.find({ userId: req.user._id }).sort({ updatedAt: -1 });
        res.json(chats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a specific chat
router.get('/:id', protect, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        if (chat.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        res.json(chat);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new chat or send message
router.post('/', protect, (req, res, next) => {
    // Log start of request
    console.log(`[${new Date().toISOString()}] POST /api/chat - User: ${req.user._id}`);

    upload.single('file')(req, res, (err) => {
        if (err) {
            console.error("Multer Upload Error:", err);
            return res.status(400).json({
                message: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (Max 10MB)' : 'File upload failed',
                error: err.message
            });
        }
        next();
    });
}, async (req, res) => {
    const { message, chatId } = req.body;
    const file = req.file;

    // Log request details
    console.log('Request payload - Message length:', message?.length || 0, 'ChatId:', chatId || 'New Chat');
    if (file) {
        console.log('Attachment - Name:', file.originalname, 'Type:', file.mimetype, 'Size:', file.size);
    }

    try {
        if (!message && !file) {
            return res.status(400).json({ message: 'Message or file is required' });
        }
        let chat;

        // Mentor System Prompt
        const systemPrompt = `
      You are CodeFit AI, an AI mentor designed to help Computer Engineering students master DSA (Data Structures & Algorithms) and improve their physical fitness.
      
      Your personality:
      - Speak like a confident but supportive mentor.
      - Push students to think instead of giving direct answers immediately.
      - Encourage discipline, consistency, and growth.
      - Be energetic and motivational when talking about fitness.
      - Be structured and logical when teaching DSA.

      When solving DSA problems:
      1. First understand the problem.
      2. Ask guiding questions instead of directly giving the solution.
      3. Explain time and space complexity.
      4. Show step-by-step dry run.
      5. Provide clean code (Java preferred).
      6. Suggest optimizations.
      7. Encourage practice and revision.

      When helping with fitness:
      1. Give practical, realistic advice.
      2. Focus on habit building.
      3. Promote consistency over motivation.
      4. Give simple workout plans.
      5. Provide diet suggestions (mixed diet allowed).
      6. Keep tone strong and confident.

      Rules:
      - Use simple language.
      - Use bullet points for clarity.
      - Use code blocks for programming.
      - Be direct and honest.
      - Do not encourage shortcuts.
      - If student feels demotivated, respond like a strict but caring coach.
    `;

        // Construct history for Gemini
        // Note: For gemini-flash, we can pass system instruction in the model config or as the first message.
        // We will stick to the previous pattern of adding it as the first user message for compatibility.
        // Ideally, use systemInstruction in getGenerativeModel, but stick to working pattern.

        let history = [
            {
                role: "user",
                parts: [{ text: systemPrompt }],
            },
            {
                role: "model",
                parts: [{ text: "Understood. I am CodeFit AI, ready to guide you in DSA and Fitness." }],
            },
        ];

        if (chatId) {
            chat = await Chat.findById(chatId);
            if (!chat) {
                return res.status(404).json({ message: 'Chat not found' });
            }
            if (chat.userId.toString() !== req.user._id.toString()) {
                return res.status(401).json({ message: 'Not authorized' });
            }

            // Append previous messages to history
            // We need to support attachments in history reconstruction
            chat.messages.forEach(msg => {
                const parts = [{ text: msg.content }];

                // If message has attachments, try to read them
                if (msg.attachments && msg.attachments.length > 0) {
                    msg.attachments.forEach(att => {
                        try {
                            if (fs.existsSync(att.filePath)) {
                                parts.push(fileToGenerativePart(att.filePath, att.fileType));
                            }
                        } catch (err) {
                            console.error("Error reading attachment for history:", err);
                        }
                    });
                }

                history.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: parts
                });
            });
        } else {
            // Create new chat
            chat = new Chat({
                userId: req.user._id,
                messages: [],
                title: message ? (message.substring(0, 30) + '...') : 'New Image Chat',
            });
        }

        // Prepare current message parts
        const currentParts = [];
        if (message) {
            currentParts.push({ text: message });
        }

        // Handle file upload
        let attachments = [];
        if (file) {
            // Sanitize mimeType (remove parameters like ;codecs=opus)
            const cleanMimeType = file.mimetype.split(';')[0];
            const part = fileToGenerativePart(file.path, cleanMimeType);
            currentParts.push(part);

            attachments.push({
                filePath: file.path,
                fileType: cleanMimeType,
                originalName: file.originalname
            });
        }

        // Add new user message to history logic (for local tracking before sending)
        // Note: .startChat with history usually expects the history *excluding* the new message.
        // We send the new message via .sendMessage

        // Generate response
        let text = "";
        let modelSuccess = false;
        let lastError = null;

        for (let mIdx = 0; mIdx < MODEL_FALLBACKS.length; mIdx++) {
            const activeModelName = MODEL_FALLBACKS[mIdx];
            console.log(`[AI] Attempting generation with model: ${activeModelName}`);

            try {
                const activeModel = genAI.getGenerativeModel({ model: activeModelName });
                const chatSession = activeModel.startChat({ history: history });
                const result = await callGeminiWithRetry(chatSession, currentParts);
                const response = await result.response;
                text = response.text();
                modelSuccess = true;
                console.log(`[AI] Success with model: ${activeModelName}`);
                break;
            } catch (err) {
                const is404 = err.status === 404 || err.message.includes('404') || err.message.includes('not found') || err.message.includes('not supported');
                const isQuota = err.status === 429 || err.message.includes('429') || err.message.includes('Quota') || err.message.includes('limit');

                if ((is404 || isQuota) && mIdx < MODEL_FALLBACKS.length - 1) {
                    console.warn(`[AI] Model ${activeModelName} failed (${is404 ? '404' : '429 Quota'}). Trying next fallback...`);
                    continue;
                }
                throw err; // Re-throw if no more fallbacks or different error
            }
        }

        // Save messages to DB
        chat.messages.push({
            role: 'user',
            content: message || '[Attachment Sent]',
            attachments: attachments
        });
        chat.messages.push({
            role: 'model',
            content: text
        });
        await chat.save();

        // --- Gamification Logic Start ---
        try {
            const user = req.user;
            const msgLower = (message || '').toLowerCase();

            // Keywords for detection
            const codingKeywords = ['code', 'java', 'dsa', 'algorithm', 'function', 'bug', 'debug', 'react', 'node', 'array', 'string', 'binary', 'tree', 'graph', 'sort'];
            const fitnessKeywords = ['workout', 'gym', 'exercise', 'diet', 'protein', 'calories', 'muscle', 'fitness', 'stretch', 'yoga', 'recovery', 'health', 'weight'];

            let activityType = null;
            if (codingKeywords.some(k => msgLower.includes(k))) activityType = 'coding';
            if (fitnessKeywords.some(k => msgLower.includes(k))) {
                activityType = activityType === 'coding' ? 'both' : 'fitness';
            }

            if (activityType) {
                const today = new Date().setHours(0, 0, 0, 0);
                const lastActivity = user.activityHistory[user.activityHistory.length - 1];
                const lastDate = lastActivity ? new Date(lastActivity.date).setHours(0, 0, 0, 0) : null;

                if (lastDate !== today) {
                    // Update streaks
                    if (activityType === 'coding' || activityType === 'both') {
                        user.codingStreak = (lastDate === today - 86400000) ? user.codingStreak + 1 : 1;
                    }
                    if (activityType === 'fitness' || activityType === 'both') {
                        user.fitnessStreak = (lastDate === today - 86400000) ? user.fitnessStreak + 1 : 1;
                    }

                    // Add to history
                    user.activityHistory.push({
                        date: new Date(),
                        type: activityType,
                        intensity: 1
                    });

                    // Award XP
                    user.experiencePoints += 10;
                    await user.save();
                }
            }
        } catch (gammaErr) {
            console.error("Gamification Sync Error:", gammaErr);
        }
        // --- Gamification Logic End ---

        res.json({ chat, response: text });

    } catch (error) {
        console.error("Gemini Error:", error);
        let userFriendlyMessage = 'AI generation failed. Please check your connection or try again later.';

        if (error.status === 503 || error.message.includes('503 Service Unavailable') || error.message.includes('high demand')) {
            userFriendlyMessage = 'The AI service is currently overloaded due to high demand. Please try again in 1-2 minutes.';
        } else if (error.status === 429 || error.message.includes('429 Too Many Requests') || error.message.includes('Quota exceeded')) {
            userFriendlyMessage = 'Daily AI usage limit reached (Free Tier). Please try again in about an hour or tomorrow.';
        }

        res.status(500).json({ message: userFriendlyMessage, error: error.message });
    }
});

// Delete Chat
router.delete('/:id', protect, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        if (chat.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await Chat.deleteOne({ _id: req.params.id });

        res.json({ message: 'Chat removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


module.exports = router;
