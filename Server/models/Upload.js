const mongoose = require('mongoose');

const UploadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String, // Where the file is stored locally
    required: true
  },
  fileType: {
    type: String, // e.g., 'application/pdf'
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  lastModified: { type: Number, default: Date.now },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

UploadSchema.pre('save', function(next) {
    this.lastModified = Date.now();
    next();
});

module.exports = mongoose.model('Upload', UploadSchema);