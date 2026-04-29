const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');

// Store files in memory to process them immediately
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/direct-send', async (req, res) => {
    try {
        const { numbers, message, service } = req.body; // service is 'sms' or 'whatsapp'

        if (!numbers || !message || !service) {
            return res.status(400).json({ message: "Numbers, message, and service type are required." });
        }

        // Respond quickly so UI stops loading
        res.status(200).json({ 
            success: true, 
            message: `Initiated bulk ${service.toUpperCase()} sending.` 
        });

        // Run sending logic in background
        (async () => {
            for (const num of numbers) {
                try {
                    if (service === 'whatsapp') {
                        // Logic for WhatsApp Gateway (e.g., Twilio/Meta)
                        console.log(`[WHATSAPP] Sending to ${num}: ${message}`);
                    } else {
                        // Logic for SMS Gateway (e.g., TextLocal/Fast2SMS)
                        console.log(`[SMS] Sending to ${num}: ${message}`);
                    }
                    
                    // Delay to respect rate limits
                    await new Promise(resolve => setTimeout(resolve, 300));
                } catch (err) {
                    console.error(`Error sending ${service} to ${num}:`, err.message);
                }
            }
        })();

    } catch (error) {
        console.error("Bulk Send Error:", error);
        if (!res.headersSent) res.status(500).json({ message: "Internal Server Error." });
    }
});

module.exports = router;