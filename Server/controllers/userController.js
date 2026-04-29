// Server/controllers/userController.js

const mongoose = require('mongoose');
const User = require('../models/User');
const Voter = require('../models/Voters');
const Log = require('../models/Log'); // <--- IMPORT LOG MODEL
const bcrypt = require('bcryptjs');

// --- HELPER: Create Log Entry ---
const createLog = async (action, req, targetUser, details = "") => {
    try {
        console.log("--- LOGGING ATTEMPT ---");
        let adminId, adminName;

        // Try to find the admin from the request (Normal way)
        if (req.user) {
            adminId = req.user._id;
            adminName = req.user.name;
        } else {
            // IF MISSING: Fetch the Superadmin directly from DB
            console.log("⚠️ req.user missing. Auto-assigning to Superadmin...");
            const superAdmin = await User.findOne({ role: 'superadmin' });
            
            if (superAdmin) {
                adminId = superAdmin._id;
                adminName = superAdmin.name;
            } else {
                // Fallback if no superadmin exists yet (Prevents crash)
                adminId = new mongoose.Types.ObjectId(); 
                adminName = "System Admin";
            }
        }

        // Save the log
        await Log.create({
            action,
            performedBy: adminId, 
            performedByName: adminName,
            targetId: targetUser ? targetUser._id : null,
            targetName: targetUser ? targetUser.name : 'Unknown',
            details,
            ipAddress: req.ip || req.connection.remoteAddress
        });

        console.log("✅ Log Saved Successfully");

    } catch (err) {
        console.error("❌ Logging Error:", err);
    }
};

// --- 1. GET ALL LOGS (New Function) ---
const getSystemLogs = async (req, res) => {
    try {
        const logs = await Log.find({})
            .sort({ createdAt: -1 }) // Newest first
            .limit(100); // Limit to last 100 logs to prevent overload
        
        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ message: "Error fetching logs", error: error.message });
    }
};

// --- 2. CREATE USER (Updated with Logging) ---
const generateVoterId = () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const randomLetters = Array(3).fill(0).map(() => letters[Math.floor(Math.random() * letters.length)]).join("");
    const randomNumbers = Math.floor(1000000 + Math.random() * 9000000);
    return `${randomLetters}${randomNumbers}`;
};

const createUser = async (req, res) => {
    try {
        let { name, email, password, role, voterId, age } = req.body;

        if (!voterId) voterId = generateVoterId();

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email is already registered" });
        }

        const newUser = new User({ name, email, password, role, voterId, age });
        await newUser.save();

        const userResponse = newUser.toObject();
        delete userResponse.password;

        // ➤ LOG THIS ACTION
        await createLog('CREATE_USER', req, newUser, `Role: ${role}`);

        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: userResponse,
        });
    } catch (error) {
        console.error("Create User Error:", error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ success: false, message: `Duplicate value for ${field}` });
        }
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

// --- 3. UPDATE USER (Updated with Logging) ---
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, password } = req.body;

        let updateData = { name, email, role };

        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedUser) return res.status(404).json({ message: "User not found" });

        // ➤ LOG THIS ACTION
        await createLog('UPDATE_USER', req, updatedUser, `Updated details for ${email}`);

        res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

// --- 4. DELETE USER (Updated with Logging) ---
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (req.user && user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "You cannot delete yourself!" });
        }

        // ➤ LOG THIS ACTION (Must be done before deleting, or save the name first)
        await createLog('DELETE_USER', req, user, "User removed from system");

        await User.findByIdAndDelete(req.params.id);
        
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// --- 5. GET ALL USERS (Existing) ---
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select("-password").sort({ createdAt: -1 });
        res.status(200).json({ data: users });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const getUserAnalytics = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "User ID required" });

    const user = await User.findById(userId).select("name mobile");
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Village-wide aggregation based on colorCode
    const colorAgg = await Voter.aggregate([
      {
        $group: {
          _id: "$colorCode", 
          count: { $sum: 1 },
        },
      },
    ]);

    // 2. Map color codes back to labels
    // Based on your specific UI colors:
    // Green (#1EB139) = माझा मतदार
    // Teal (#00C8C8) = हितचिंतक
    // Yellow (#FFD740) = ५०-५०
    // Red (#FF5252) = विरोधक
    const analysis = {
      supporter: 0,
      my_voter: 0,
      neutral: 0,
      opponent: 0
    };

    colorAgg.forEach((item) => {
      if (item._id === "#00C8C8") analysis.supporter = item.count;
      else if (item._id === "#1EB139") analysis.my_voter = item.count;
      else if (item._id === "#FFD740") analysis.neutral = item.count;
      else if (item._id === "#FF5252") analysis.opponent = item.count;
    });

    // 3. Global Counts for the Stats Section
    // Counting ALL voters where colorCode is Green (#1EB139)
    const globalGreenVoters = await Voter.countDocuments({ colorCode: "#1EB139" });
    const totalVotersInVillage = await Voter.countDocuments({});

    // Score remains user-specific based on their profile data
    const score = (analysis.my_voter * 10) + (analysis.supporter * 5) + (analysis.neutral * 2);

    res.json({
      user: {
        name: user.name,
        mobile: user.mobile,
        score: score,
      },
      stats: {
        my_voters: globalGreenVoters, 
        total_assigned: totalVotersInVillage,
        search_count: 0,
        calls_made: 0,
        messages_sent: 0
      },
      analysis: analysis,
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getMyPhoneBook = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user and populate the 'voter' field inside savedContacts
    const user = await User.findById(userId).populate({
      path: 'savedContacts.voter',
      model: 'Voter'
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Filter out any null voters (in case a voter was deleted)
    const validContacts = user.savedContacts
      .filter(item => item.voter !== null)
      .map(item => item.voter); // Return just the voter details

    res.status(200).json(validContacts);
  } catch (error) {
    console.error("Fetch Phonebook Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
    getUserAnalytics,
    getAllUsers,
    deleteUser,
    createUser,
    updateUser,
    getSystemLogs,
    getMyPhoneBook
};