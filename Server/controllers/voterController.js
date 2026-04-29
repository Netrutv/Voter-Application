const Voter = require('../models/Voters');
const User = require('../models/User');

// Updated Controller in your backend
// const getAllVoters = async (req, res) => {
//     try {
//         const page = parseInt(req.query.page) || 1;
//         const limit = 20;
//         const { search, surname, area, house } = req.query;

//         let query = {};

//         // 1. General Search (Name or EPIC)
//         if (search) {
//             const keywords = search.trim().split(/\s+/).map(word => new RegExp(word, 'i'));
//             query.$and = keywords.map(kw => ({
//                 $or: [{ name: kw }, { voter_name_eng: kw }, { epic_id: kw }]
//             }));
//         }

//         // 2. Surname Filter (Matches end of name or English name)
//         if (surname) {
//             query.voter_name_eng = new RegExp(`${surname}$`, 'i');
//         }

//         // 3. Area-wise Segmentation (yadi_bhag)
//         if (area) {
//             query.yadi_bhag = area; // Exact match for the area selected from dropdown
//         }

//         // 4. Address/House Filter
//         if (house) {
//             query.house = new RegExp(house, 'i');
//         }

//         const voters = await Voter.find(query)
//             .sort({ srNo: 1 }) // Sorting by Serial Number is better for field work
//             .skip((page - 1) * limit)
//             .limit(limit);

//         res.json(voters);
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// };

const getAllVoters = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        
        // 1. Extract new params: 'booth' and 'tab'
        const { search, surname, area, house, booth, tab } = req.query;

        let query = {};

        // --- EXISTING LOGIC ---

        // 2. General Search (Name or EPIC)
        if (search) {
            // Check if search is a valid string
            const searchStr = String(search).trim(); 
            if (searchStr) {
                const keywords = searchStr.split(/\s+/).map(word => new RegExp(word, 'i'));
                query.$and = keywords.map(kw => ({
                    $or: [
                        { name: { $regex: kw } }, 
                        { voter_name_eng: { $regex: kw } }, 
                        { epic_id: { $regex: kw } }
                    ]
                }));
            }
        }

        // 3. Surname Filter
        if (surname) {
            query.voter_name_eng = new RegExp(`${surname}$`, 'i');
        }

        // 4. Area-wise Segmentation
        if (area) {
            query.yadi_bhag = area;
        }

        // 5. Address/House Filter
        if (house) {
            query.house = new RegExp(house, 'i');
        }

        // --- NEW LOGIC ADDED HERE ---

        // 6. Booth Filter (Extracts middle number from "134/291/17")
        if (booth && booth !== 'All') {
            // Matches /291/ inside the string to avoid matching serial numbers
            query.part = { $regex: `/${booth}/` };
        }

        // 7. "My Voters" Filter (Tab Selection)
        if (tab === 'my') {
            // Only fetch voters who have a color assigned (not null)
            query.colorCode = "#1EB139"; // Only Green
        }

        // --- EXECUTE QUERY ---
        
        const voters = await Voter.find(query)
            .sort({ srNo: 1 }) 
            .skip((page - 1) * limit)
            .limit(limit);
        
        // Optional: Return total count for pagination on frontend
        // const total = await Voter.countDocuments(query);

        res.json(voters); // Or res.json({ voters, total });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const seedVoters = async (req, res) => {
    try {
        // Create a new instance of the Voter model with data from the request
        const newVoter = new Voter({
            name: req.body.name,
            age: req.body.age,
            gender: req.body.gender,
            epic: req.body.epic,
            booth: req.body.booth
        });

        const savedVoter = await newVoter.save();
        res.status(201).json(savedVoter);
    } catch (error) {
        console.error(error);
        res.status(400).json({ 
            message: "Failed to insert voter", 
            error: error.message 
        });
    }
};

const getVoterById = async (req, res) => {
    try {
        const voter = await Voter.findById(req.params.id);
        res.json(voter);
    } catch (error) {
        res.status(404).json({ message: "Voter not found" });
    }
};

// PUT /api/voters/:id
// const updateVoter = async (req, res) => {
//   try {
//     const { id } = req.params;
    
//     // 1. Update the document
//     const updatedVoter = await Voter.findByIdAndUpdate(
//       id, 
//       { $set: req.body }, 
//       { new: true, runValidators: true } 
//     );

//     if (!updatedVoter) {
//       return res.status(404).json({ message: "Voter not found" });
//     }

//     // 2. Log the activity (Highly recommended for Super Admin tracking)
//     console.log(`Admin updated voter: ${updatedVoter.name} (${id})`);

//     res.status(200).json(updatedVoter);
//   } catch (error) {
//     console.error("Update Error:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

const updateVoter = async (req, res) => {
  try {
    const { id } = req.params;
    const { isSavingToPhoneBook, userId, ...updateData } = req.body; 

    // DEBUG: Check what the backend is receiving
    console.log(`Update Request for Voter: ${id}`);
    console.log(`Received userId: ${userId}`);

    // 1. Update Global Voter Info
    const updatedVoter = await Voter.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedVoter) {
      return res.status(404).json({ message: "Voter not found" });
    }

    // 2. Add to User's personal list if adminId is valid
    if (isSavingToPhoneBook) {
      if (!userId) {
        console.log("❌ Sync Failed: isSavingToPhoneBook is true but userId is missing.");
      } else {
        // Find user and push the voter ID into the savedContacts array
        const userUpdate = await User.findByIdAndUpdate(
          userId,
          { $addToSet: { savedContacts: { voter: id } } },
          { new: true }
        );

        if (userUpdate) {
            console.log(`✅ Voter ${id} successfully linked to User ${userId}`);
        } else {
            console.log(`⚠️ User ${userId} not found in database`);
        }
      }
    }

    res.status(200).json(updatedVoter);
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getFamilyMembers = async (req, res) => {
    try {
        // Just grab the ID from the query parameters
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ message: "Voter ID is required" });
        }

        // Find the specific voter in the DB
        const voter = await Voter.findById(id);

        if (!voter) {
            return res.status(404).json({ message: "Voter not found" });
        }

        let resultName = "";

        // The exact check you asked for:
        if (voter.relative_type === "Father") {
            resultName = voter.fatherName;
        } else {
            // Else (Husband or anything else)
            resultName = voter.relative_name_eng;
        }

        // Return just the correct name
        res.status(200).json({ name: resultName });
    } catch (error) {
        console.error("Family Search Error:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getAllVoters, seedVoters, getVoterById, updateVoter, getFamilyMembers };