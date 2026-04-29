const User = require('../models/User'); // Your User schema
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// const loginVoter = async (req, res) => {
//     const { voterId, password } = req.body;
//     console.log(voterId, password);

//     try {
//         // 1. Check if user exists
//         const user = await User.findOne({ voterId });
//         // console.log(user);
//         if (!user) {
//             return res.status(400).json({ message: "Invalid Voter ID or Password" });
//         }

//         // 2. Compare Password
//         const isMatch = await bcrypt.compare(password, user.password);
//         // console.log(isMatch);
//         if (!isMatch) {
//             return res.status(400).json({ message: "Invalid Voter ID or Password" });
//         }

//         // 3. Create JWT Token
//         const token = jwt.sign(
//             { id: user._id, isAdmin: user.isAdmin },
//             process.env.JWT_SECRET,
//             { expiresIn: '1d' }
//         );

//         console.log(token);

//         res.status(200).json({
//             token,
//             user: {
//                 id: user._id,
//                 name: user.name,
//                 hasVoted: user.hasVoted
//             }
//         });
//     } catch (error) {
//         res.status(500).json({ message: "Server Error" });
//     }
// };

// authController.js

const loginVoter = async (req, res) => {
    // 1. CHANGED: Accept email to match your Frontend UI
    const { email, password } = req.body; 
    console.log(email, password);
    try {
        // 2. Check if user exists using Email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Invalid Email or Password" });
        }

        // 3. Compare Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid Email or Password" });
        }

        // 4. Create JWT Token
        // FIX: Use 'user.role' instead of 'user.isAdmin' to match your Schema
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            'klcnvdslkvkldskvldnklvnskdlvnksdndslkvdsnklsdfvlmpsdvl',
            { expiresIn: '1d' }
        );

        // 5. Send response
        // We send 'role' back so the Frontend knows where to redirect
        res.status(200).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role, // <--- Send this to the frontend
                hasVoted: user.hasVoted
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

const registerVoter = async (req, res) => {
    try {
        const { name, voterId, email, password, age } = req.body;

        // Validation... (Keep your existing check for existingVoter)

        // DO NOT hash the password here. Pass it as PLAIN TEXT.
        // Your User.js model's pre-save hook will handle the hashing.
        const newVoter = new User({
            name,
            voterId,
            email,
            password, // Use the plain text password from req.body
            age
        });

        await newVoter.save(); 
        res.status(201).json({ message: "Voter registered successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
module.exports = { loginVoter, registerVoter };