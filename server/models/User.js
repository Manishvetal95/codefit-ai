const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    profilePicture: {
        type: String,
        default: null,
    },
    codingStreak: {
        type: Number,
        default: 0
    },
    fitnessStreak: {
        type: Number,
        default: 0
    },
    activityHistory: [{
        date: { type: Date, default: Date.now },
        type: { type: String, enum: ['coding', 'fitness', 'both'] },
        intensity: { type: Number, default: 1 }
    }],
    experiencePoints: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
});

const User = mongoose.model('User', userSchema);
module.exports = User;
