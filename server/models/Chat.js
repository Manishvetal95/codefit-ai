const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        default: 'New Chat',
    },
    messages: [
        {
            role: {
                type: String,
                enum: ['user', 'model'],
                required: true,
            },
            content: {
                type: String,
                required: true,
            },
            attachments: [{
                filePath: String,
                fileType: String, // 'image/png', 'audio/mp3', etc.
                originalName: String
            }],
            timestamp: {
                type: Date,
                default: Date.now,
            },
        },
    ],
}, {
    timestamps: true,
});

const Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat;
