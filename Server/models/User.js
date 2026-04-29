const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    voterId: {
        type: String,
        unique: true,  // Keep this true
        sparse: true,  // <--- ADD THIS! This allows multiple users to have 'null' voterIds
        uppercase: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        // required: true // ⚠️ Make optional if Admin doesn't need age
    },
    hasVoted: {
        type: Boolean,
        default: false
    },
    // 👇 UPDATED ROLES
    role: {
        type: String,
        enum: ['user', 'admin', 'superadmin'], // Added 'superadmin'
        default: 'user' // Changed 'voter' to 'user' to match your frontend
    },
    savedContacts: [{
        voter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Voter'
        },
        savedAt: {
            type: Date,
            default: Date.now
        }
    }],
    lastModified: { type: Number, default: Date.now }, // 🆕 For Sync
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
        throw err;
    }
});

UserSchema.pre('save', function(next) {
    this.lastModified = Date.now();
    next();
});

module.exports = mongoose.model('User', UserSchema);