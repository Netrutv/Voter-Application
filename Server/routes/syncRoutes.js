const express = require('express');
const router = express.Router();
const Voter = require('../models/Voters');

// Route to get all voters for the initial offline download
router.get('/download-voters', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5000;
        const skip = parseInt(req.query.skip) || 0;

        const voters = await Voter.find({ 
            isDeleted: { $ne: true } // Handles existing 50k records without this field
        })
        .select('name epic_id age gender isVoted part mahanagarpalika')
        .skip(skip)
        .limit(limit)
        .lean();

        const total = await Voter.countDocuments({ isDeleted: { $ne: true } });

        res.status(200).json({
            voters,
            total,
            hasMore: skip + limit < total
        });
    } catch (err) {
        console.error("Backend Error:", err);
        res.status(500).json({ error: "Failed to fetch voters" });
    }
});

router.post('/upload-voters', async (req, res) => {
    try {
        const { voters, userId } = req.body;

        if (!voters || !Array.isArray(voters)) {
            return res.status(400).json({ error: "Invalid data format. Expected an array of voters." });
        }

        console.log(`Syncing ${voters.length} records from user: ${userId}`);

        // Prepare bulk operations for high performance
        const bulkOps = voters.map(v => ({
            updateOne: {
                filter: { _id: v.id }, // Maps SQLite 'id' back to MongoDB '_id'
                update: { 
                    $set: {
                        mobile: v.mobile,
                        mobile2: v.mobile2,
                        colorCode: v.colorCode,
                        caste: v.caste,
                        designation: v.designation,
                        society: v.society,
                        flatNo: v.flatNo,
                        dob: v.dob,
                        demands: v.demands,
                        isDead: v.isDead === 1,   // Convert SQLite 1/0 back to Boolean
                        isStar: v.isStar === 1,
                        isVoted: v.isVoted === 1,
                        userId: userId,           // Track who made the last change
                        lastModified: Date.now()
                    }
                }
            }
        }));

        const result = await Voter.bulkWrite(bulkOps);

        res.status(200).json({ 
            success: true, 
            message: "Sync successful", 
            matchedCount: result.matchedCount, 
            modifiedCount: result.modifiedCount 
        });

    } catch (err) {
        console.error("Backend Sync Error:", err);
        res.status(500).json({ error: "Failed to sync offline data." });
    }
});

module.exports = router;