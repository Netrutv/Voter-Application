const mongoose = require('mongoose');
const Voter = require("../models/Voters");
const User = require("../models/User");

const getSurveyStats = async (req, res) => {
    try {
        console.log("📊 Fetching Dashboard Statistics...");

        // 1. Rule: A record is "Surveyed" only if it was touched by a user
        const updatedFilter = {
            $or: [
                { lastModified: { $exists: true, $ne: null } },
                { userId: { $exists: true, $ne: null } }
            ]
        };

        // 2. Run counts in parallel for better performance
        const [totalPopulation, totalSurveyed] = await Promise.all([
            Voter.countDocuments({}), // Every single voter in the DB
            Voter.countDocuments(updatedFilter) // Only the ones edited
        ]);

        // 3. Calculate Overall Completion Percentage
        const overallCompletion = totalPopulation > 0 
            ? ((totalSurveyed / totalPopulation) * 100).toFixed(2) 
            : "0.00";

        // 4. Daily Activity (Grouped by the date in lastModified)
        const dailyProgress = await Voter.aggregate([
            { $match: updatedFilter },
            {
                $group: {
                    _id: { 
                        $dateToString: { 
                            format: "%Y-%m-%d", 
                            date: { $toDate: "$lastModified" } 
                        } 
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": -1 } },
            { $limit: 10 } // Only show last 10 days of activity
        ]);

        // 5. Surveyor Leaderboard (Matches Voter.userId to User._id)
        const userStats = await Voter.aggregate([
            { $match: updatedFilter },
            { $group: { _id: "$userId", surveyCount: { $sum: 1 } } },
            {
                $lookup: {
                    from: "users", // Ensure this matches your MongoDB collection name
                    localField: "_id",
                    foreignField: "_id",
                    as: "worker"
                }
            },
            { $unwind: { path: "$worker", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    name: { $ifNull: ["$worker.name", "Unknown Worker"] },
                    surveyCount: 1
                }
            },
            { $sort: { surveyCount: -1 } }
        ]);

        // 6. Final Response
        res.status(200).json({
            success: true,
            stats: {
                totalPopulation,   // Card 1
                totalSurveyed,     // Card 2
                overallCompletion, // Card 3
                dailyProgress,     // Daily Activity Graph/List
                userStats          // Leaderboard Table
            }
        });

        console.log(`✅ Stats Sync: ${totalSurveyed}/${totalPopulation} (${overallCompletion}%)`);

    } catch (error) {
        console.error("❌ getSurveyStats Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to generate dashboard statistics",
            error: error.message 
        });
    }
};

const getWorkerDetails = async (req, res) => {
    try {
        const { userId } = req.params;

        // 2. Try the specific query
        const voterList = await Voter.find({
            userId: new mongoose.Types.ObjectId(userId)
        }).lean();


        // 3. If 0 found, let's find ONE record and see what its userId looks like
        if (voterList.length === 0 && countAll > 0) {
            const sample = await Voter.findOne({}).lean();
        }

        res.status(200).json({
            success: true,
            count: voterList.length,
            voterList
        });
    } catch (error) {
        console.error("Worker Detail Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/voters
const getVoters = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        // Extract filters from request query
        const { search, color, isVoted } = req.query;

        // Build the query object
        let query = {};

        // 1. Handle Search (Name or EPIC ID)
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { voter_name_eng: { $regex: search, $options: 'i' } },
                { epic_id: { $regex: search, $options: 'i' } }
            ];
        }

        // 2. Handle Color Filter
        if (color) {
            query.colorCode = color;
        }

        // 3. Handle Voting Status
        if (isVoted === "true") query.isVoted = true;
        if (isVoted === "false") query.isVoted = false;

        // Execute Query
        const voters = await Voter.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ srNo: 1 })
            .lean(); // Lean makes it faster and returns plain JS objects

        // Total count for pagination
        const total = await Voter.countDocuments(query);
        res.json({
            success: true,
            voters,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalCount: total,
            totalFound: total // Needed for your 'Total Found' label in UI
        });
    } catch (err) {
        console.error("Backend Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

const getBoothStats = async (req, res) => {
    try {
        const stats = await Voter.aggregate([
            {
                $project: {
                    // Extract just the 3-digit booth number (e.g., 285)
                    boothNumber: {
                        $arrayElemAt: [
                            {
                                $regexFindAll: {
                                    input: { $ifNull: ["$yadi_bhag", ""] },
                                    regex: /[0-9]{3}/
                                }
                            },
                            0
                        ]
                    },
                    userId: 1,
                    yadi_bhag: 1
                }
            },
            {
                $group: {
                    // Group by the extracted number (match)
                    _id: { $ifNull: ["$boothNumber.match", "Unknown"] },
                    // Keep the full Marathi string as a subtitle
                    fullAreaName: { $first: "$yadi_bhag" },
                    totalVoters: { $sum: 1 },
                    surveyedCount: {
                        // Count voters where userId is an actual ObjectId
                        $sum: { $cond: [{ $ifNull: ["$userId", false] }, 1, 0] }
                    }
                }
            },
            { $sort: { _id: 1 } } // Sort numerically: 285, 286, 287...
        ]);

        res.status(200).json({ success: true, stats });
    } catch (error) {
        console.error("Booth Stats Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getSyncData = async (req, res) => {
    try {
        // Get lastSync timestamp from query parameters
        const { lastSync } = req.query; 
        
        let filter = { };

        // If client provides a timestamp, only fetch what changed after that
        if (lastSync && !isNaN(lastSync)) {
            filter.lastModified = { $gt: parseInt(lastSync) };
        }

        console.log("-----------------------------------------");
        console.log(`🔄 SYNC REQUEST: ${lastSync ? "INCREMENTAL" : "FULL"}`);
        
        // Fetch only modified voters and users
        const voters = await Voter.find(filter).lean();
        
        // Using a similar logic for Users if they also have a lastModified field
        const users = await User.find(filter).select("-password").lean();

        console.log(`✅ Records found: ${voters.length} voters, ${users.length} users`);
        
        // Return the current server time so the client knows when to sync from next time
        res.status(200).json({
            success: true,
            voters: voters,
            users: users,
            serverTime: Date.now() 
        });
        
        console.log("-----------------------------------------");
    } catch (error) {
        console.error("❌ Sync Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal Server Error during sync" 
        });
    }
};

const getAreaStats = async (req, res) => {
    try {
        console.log("📊 Calculating Area-wise Statistics...");

        const areaStats = await Voter.aggregate([
            {
                // Step 1: Group by the 'yadi_bhag' field
                $group: {
                    _id: "$yadi_bhag", 
                    totalVoters: { $sum: 1 },
                    // Step 2: Count as surveyed only if userId or lastModified exists
                    surveyedCount: {
                        $sum: {
                            $cond: [
                                { 
                                    $or: [
                                        { $gt: ["$lastModified", 0] }, 
                                        { $ne: ["$userId", null] }
                                    ] 
                                },
                                1, 0
                            ]
                        }
                    }
                }
            },
            {
                // Step 3: Format the output and calculate percentage
                $project: {
                    _id: 0,
                    areaName: { $ifNull: ["$_id", "Unassigned Area"] },
                    totalVoters: 1,
                    surveyedCount: 1,
                    percentage: {
                        $cond: [
                            { $gt: ["$totalVoters", 0] },
                            { $multiply: [{ $divide: ["$surveyedCount", "$totalVoters"] }, 100] },
                            0
                        ]
                    }
                }
            },
            { 
                // Step 4: Sort by highest percentage completed
                $sort: { percentage: -1 } 
            }
        ]);

        res.status(200).json({
            success: true,
            areaStats: areaStats,
            totalAreas: areaStats.length
        });

    } catch (error) {
        console.error("❌ Area Stats Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal Server Error while fetching area stats" 
        });
    }
};

module.exports = { getSurveyStats, getWorkerDetails, getVoters, getBoothStats, getSyncData, getAreaStats };