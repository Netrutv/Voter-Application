const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/uploadController');

// --- MULTER CONFIGURATION ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); 
  },
  filename: function (req, file, cb) {
    // Clean filename
    const cleanName = file.originalname.replace(/\s+/g, '_').replace(/[^\w.-]/g, '');
    cb(null, Date.now() + '-' + cleanName);
  }
});

const upload = multer({ storage: storage });

// --- ROUTES ---
router.post('/', upload.single('file'), uploadController.uploadFile);
router.get('/:userId', uploadController.getUserUploads);
router.get('/admin/all', uploadController.getAllUploads);

// NEW ROUTE: Update Status
router.patch('/:id/status', uploadController.updateStatus);

module.exports = router;