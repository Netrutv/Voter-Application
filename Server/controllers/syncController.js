const User = require('../models/User');
const Voter = require('../models/Voter');
const Log = require('../models/Log');
const Upload = require('../models/Upload');

exports.getFullSync = async (req, res) => {
    try {
        // Pull all active data
        const [users, voters, logs, uploads] = await Promise.all([
            User.find({ isDeleted: false }),
            Voter.find({ isDeleted: false }),
            Log.find({ isDeleted: false }),
            Upload.find({ isDeleted: false })
        ]);

        res.status(200).json({
            timestamp: Date.now(),
            changes: {
                users: { created: users, updated: [], deleted: [] },
                voters: { created: voters, updated: [], deleted: [] },
                logs: { created: logs, updated: [], deleted: [] },
                uploads: { created: uploads, updated: [], deleted: [] }
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Initial sync failed" });
    }
};