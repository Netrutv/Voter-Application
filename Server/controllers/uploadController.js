const Upload = require('../models/Upload');

// Function to handle the database saving part
const uploadFile = async (req, res) => {
  try {
    console.log('Processing upload...');
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { userId } = req.body; 

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const newUpload = new Upload({
      userId: userId,
      // Note: We use the *cleaned* filename from the file object, not originalname if possible, 
      // but Multer's file.filename is usually the one on disk. 
      // Ideally, use req.file.filename if you want the exact saved name.
      fileName: req.file.filename, // <--- CHANGED to req.file.filename to match what is on disk
      filePath: req.file.path,
      fileType: req.file.mimetype,
      status: 'Pending'
    });

    await newUpload.save();

    res.status(201).json({ 
      message: "File uploaded successfully", 
      data: newUpload 
    });

  } catch (error) {
    console.error("Upload Controller Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const getUserUploads = async (req, res) => {
  try {
    const { userId } = req.params;
    const uploads = await Upload.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(uploads);
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ message: "Could not fetch uploads" });
  }
};

const getAllUploads = async (req, res) => {
  try {
    const uploads = await Upload.find({}).sort({ createdAt: -1 });
    res.status(200).json(uploads);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// --- NEW FUNCTION: Update Status ---
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params; // The file ID from URL
    const { status } = req.body; // 'Approved' or 'Rejected'

    // Simple validation
    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Update in Database
    const updatedUpload = await Upload.findByIdAndUpdate(
      id,
      { status: status },
      { new: true } // Return the updated document
    );

    if (!updatedUpload) {
      return res.status(404).json({ message: "File not found" });
    }

    res.status(200).json({ message: "Status updated", data: updatedUpload });

  } catch (error) {
    console.error("Status Update Error:", error);
    res.status(500).json({ message: "Could not update status" });
  }
};

module.exports = { uploadFile, getUserUploads, getAllUploads, updateStatus };