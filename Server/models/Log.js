// Server/models/Log.js
const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: ['CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'LOGIN', 'OTHER']
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // The admin who performed the action
        required: true
    },
    performedByName: {
        type: String // Storing name directly for faster UI loading
    },
    targetId: {
        type: String, // ID of the user being created/edited/deleted
        required: false
    },
    targetName: {
        type: String, // Name of the user being affected
        required: false
    },
    details: {
        type: String // Extra info (e.g., "Changed role to admin")
    },
    ipAddress: {
        type: String
    },
    lastModified: { type: Number, default: Date.now },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

LogSchema.pre('save', function(next) {
    this.lastModified = Date.now();
    next();
});

module.exports = mongoose.model('Log', LogSchema);