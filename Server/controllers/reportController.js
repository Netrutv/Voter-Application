const Voter = require('../models/Voters');

// 1. Gender Analysis
const getGenderAnalysis = async (req, res) => {
  try {
    const { booth } = req.query; // Get booth from query params
    let matchStage = {};

    // Filter by Booth if provided and not "All"
    if (booth && booth !== 'All') {
      matchStage.part = { $regex: `/${booth}/` };
    }

    const report = await Voter.aggregate([
      { $match: matchStage }, // Stage 1: Filter by booth
      {
        $group: {
          _id: { $ifNull: ["$gender", "Unknown"] },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    res.status(200).json(report);
  } catch (error) {
    console.error("Gender Report Error:", error);
    res.status(500).json({ message: "Error generating report" });
  }
};

const getAlphabeticalList = async (req, res) => {
  try {
    const { search = '', limit = 50 } = req.query;

    // Create a filter object
    let query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' }; // Case-insensitive search
    }

    // Fetch data: Filter -> Sort A-Z -> Limit results
    const voters = await Voter.find(query)
      .sort({ name: 1 }) // 1 for A-Z, -1 for Z-A
      .select('name epic_id age gender address') // Only select needed fields
      .limit(parseInt(limit));

    res.status(200).json(voters);
  } catch (error) {
    console.error("Alphabetical List Error:", error);
    res.status(500).json({ message: "Error fetching list" });
  }
};

const getBoothAnalysis = async (req, res) => {
  try {
    const report = await Voter.aggregate([
      {
        $group: {
          _id: "$address", // Grouping by Address (Area)
          count: { $sum: 1 } // Counting voters in that area
        }
      },
      {
        $sort: { count: -1 } // Sort by highest count first
      }
    ]);
    res.status(200).json(report);
  } catch (error) {
    console.error("Booth Report Error:", error);
    res.status(500).json({ message: "Error generating report" });
  }
};

const getColorReport = async (req, res) => {
  try {
    // 1. Group by 'colorCode' because that is what we save
    const colorCounts = await Voter.aggregate([
      {
        $group: {
          _id: "$colorCode", 
          count: { $sum: 1 }
        }
      }
    ]);

    // 2. Count total documents
    const totalVoters = await Voter.countDocuments();

    // 3. Initialize default response
    let response = {
      supporter: 0, // #00C8C8
      my_voter: 0,  // #1EB139
      neutral: 0,   // #FFD740
      opponent: 0,  // #FF5252
      blank: 0
    };

    let classifiedCount = 0;

    // 4. Map Hex Codes to Categories
    colorCounts.forEach(item => {
      const color = item._id; 
      const count = item.count;

      if (color === '#00C8C8') {
        response.supporter = count;
        classifiedCount += count;
      } else if (color === '#1EB139') {
        response.my_voter = count;
        classifiedCount += count;
      } else if (color === '#FFD740') {
        response.neutral = count;
        classifiedCount += count;
      } else if (color === '#FF5252') {
        response.opponent = count;
        classifiedCount += count;
      }
    });

    // 5. Calculate remaining as Blank (Null or different colors)
    response.blank = totalVoters - classifiedCount;

    res.status(200).json(response);

  } catch (error) {
    console.error("Color Report Error:", error);
    res.status(500).json({ message: "Error generating report" });
  }
};

// voterController.js
// Inside getVotersBySurname in reportController.js
// reportController.js
const getVotersBySurname = async (req, res) => {
    try {
        const { surname, booth } = req.query;

        if (!surname) {
            return res.status(400).json({ message: "Surname is required" });
        }

        // Use a more flexible regex for Marathi characters
        // This matches the surname at the start of the string
        let query = {
            name: { $regex: new RegExp(`^${surname}`, 'i') }
        };

        if (booth && booth !== 'All') {
            query.part = { $regex: `/${booth}/` };
        }

        const voters = await Voter.find(query).sort({ srNo: 1 });
        
        // Always return an array, even if empty
        res.status(200).json(voters || []);
    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// You can add more report functions here later (e.g., getAgeAnalysis)

const getSurnameReport = async (req, res) => {
  try {
    const { booth } = req.query; // Get booth from query params
    let matchStage = {};

    // Filter by Booth if provided and not "All"
    if (booth && booth !== 'All') {
      matchStage.part = { $regex: `/${booth}/` };
    }

    const report = await Voter.aggregate([
      { $match: matchStage }, // Stage 1: Filter by booth
      {
        $project: {
          // Extract the first word as the surname
          surname: { $arrayElemAt: [{ $split: ["$name", " "] }, 0] }
        }
      },
      {
        $group: {
          _id: "$surname",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 } // Sort by most frequent surname
      }
    ]);

    res.status(200).json(report);
  } catch (error) {
    console.error("Surname Report Error:", error);
    res.status(500).json({ message: "Error generating report" });
  }
};

const getBirthdayReport = async (req, res) => {
  try {
    const { mode = 'today', month, booth } = req.query;

    const today = new Date();
    let currentMonth = today.getMonth() + 1;
    let currentDay = today.getDate();
    let targetMonth = month ? parseInt(month) : currentMonth;

    // Build the initial match filter
    let initialMatch = {
      dob: { $ne: null, $exists: true, $nin: ["", "null", "undefined"] }
    };

    if (booth && booth !== "All") {
      initialMatch.part = { $regex: booth, $options: 'i' };
    }

    const voters = await Voter.aggregate([
      { $match: initialMatch }, // Stage 1: Filter out empty/invalid DOBs and filter by booth
      {
        $addFields: {
          // Stage 2: Safely convert string to date
          dateObj: {
            $dateFromString: {
              dateString: "$dob",
              format: "%d/%m/%Y",
              onError: null, // If parsing fails, return null instead of crashing
              onNull: null
            }
          }
        }
      },
      {
        $match: {
          dateObj: { $ne: null }, // Filter out any that failed parsing
          $expr: (mode === 'today') 
            ? {
                $and: [
                  { $eq: [{ $month: "$dateObj" }, currentMonth] },
                  { $eq: [{ $dayOfMonth: "$dateObj" }, currentDay] }
                ]
              }
            : { $eq: [{ $month: "$dateObj" }, targetMonth] }
        }
      },
      { $project: { name: 1, epic_id: 1, dob: 1, mobile: 1, part: 1 } },
      { $sort: { name: 1 } }
    ]);

    res.status(200).json(voters);
  } catch (error) {
    console.error("Birthday Report Error:", error);
    res.status(500).json({ message: "Error fetching birthdays" });
  }
};

// 7. Age Group Analysis (Robust JS Version)
const getAgeAnalysis = async (req, res) => {
  try {
    const { booth } = req.query; // Get booth from query params
    let query = {};

    // Filter by Booth if provided
    if (booth && booth !== 'All') {
      query.part = { $regex: `/${booth}/` };
    }

    // Fetch ages only for the selected booth
    const voters = await Voter.find(query, 'age').lean();

    const buckets = { "18-25": 0, "26-35": 0, "36-55": 0, "56-65": 0, "66-84": 0, "85+": 0 };

    const parseAge = (ageStr) => {
      if (!ageStr) return 0;
      let str = ageStr.toString().replace(/[०-९]/g, (d) => "०१२३४५६७८९".indexOf(d));
      return parseInt(str) || 0;
    };

    voters.forEach(v => {
      const age = parseAge(v.age);
      if (age >= 18 && age <= 25) buckets["18-25"]++;
      else if (age >= 26 && age <= 35) buckets["26-35"]++;
      else if (age >= 36 && age <= 55) buckets["36-55"]++;
      else if (age >= 56 && age <= 65) buckets["56-65"]++;
      else if (age >= 66 && age <= 84) buckets["66-84"]++;
      else if (age >= 85) buckets["85+"]++;
    });

    const report = Object.keys(buckets).map(key => ({ _id: key, count: buckets[key] }));
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ message: "Error generating report" });
  }
};

const getCommunityReport = async (req, res) => {
  try {
    const surnameData = await Voter.aggregate([
      {
        $project: {
          // Robust split: handles multiple spaces and trims whitespace
          surname: { $arrayElemAt: [{ $split: [{ $trim: { input: "$name" } }, " "] }, 0] }
        }
      },
      {
        $group: {
          _id: "$surname",
          count: { $sum: 1 }
        }
      }
    ]);

    // B. Expanded Mapping (Supporting both English and Devanagari)
    const surnameMap = {
      // Marathi
      "भोसले": "Marathi", "Bhosale": "Marathi",
      "पाटील": "Marathi", "Patil": "Marathi",
      "पवार": "Marathi", "Pawar": "Marathi",
      "शिंदे": "Marathi", "Shinde": "Marathi",
      "गायकवाड": "Marathi", "Gaikwad": "Marathi",

      // North Indian
      "Singh": "North Indian", "सिंह": "North Indian",
      "Sharma": "North Indian", "शर्मा": "North Indian",
      "Yadav": "North Indian", "यादव": "North Indian",

      // Muslims
      "Khan": "Muslims", "खान": "Muslims",
      "Shaikh": "Muslims", "शेख": "Muslims",
      "Ansari": "Muslims", "अन्सारी": "Muslims",

      // Gujarati
      "Patel": "Gujarati", "पटेल": "Gujarati",
      "Shah": "Gujarati", "शाह": "Gujarati"
    };

    const communityCounts = {
      "Marathi": 0, "North Indian": 0, "Muslims": 0,
      "Gujarati": 0, "South India": 0, "Punjabi": 0,
      "Christian": 0, "Sindhi": 0, "Others": 0
    };

    // D. Classification logic
    surnameData.forEach(item => {
      const surname = item._id;
      const community = surnameMap[surname] || "Others";
      
      // Safety check to ensure community exists in our counter
      if (communityCounts.hasOwnProperty(community)) {
        communityCounts[community] += item.count;
      } else {
        communityCounts["Others"] += item.count;
      }
    });

    // E. Formatting for your React Native FlatList
    const report = Object.keys(communityCounts)
      .map(key => ({
        id: key.toLowerCase().replace(/\s/g, '_'), // Unique ID like 'north_indian'
        name: key,
        count: communityCounts[key]
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);

    res.status(200).json(report);

  } catch (error) {
    console.error("Community Report Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// 9. Beneficiary/Scheme Report
const getSchemeAnalysis = async (req, res) => {
  try {
    const report = await Voter.aggregate([
      {
        $match: {
          scheme: { $exists: true, $ne: null, $ne: "" } // Only find voters with a scheme
        }
      },
      {
        $group: {
          _id: "$scheme", // Group by Scheme Name
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Format for frontend
    const formattedReport = report.map(item => ({
      id: item._id, // Scheme Name
      name: item._id,
      count: item.count
    }));

    res.status(200).json(formattedReport);

  } catch (error) {
    console.error("Scheme Report Error:", error);
    res.status(500).json({ message: "Error generating report" });
  }
};

const getAgeRangeReport = async (req, res) => {
  try {
    const { min, max, booth } = req.query;

    let matchStage = {};
    if (booth && booth !== 'All') {
      matchStage.part = { $regex: `/${booth}/` };
    }

    const voters = await Voter.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          ageNumeric: { $convert: { input: "$age", to: "int", onError: null, onNull: null } }
        }
      },
      {
        $match: {
          ageNumeric: { $gte: parseInt(min), $lte: parseInt(max) }
        }
      },
      { $sort: { ageNumeric: 1, name: 1 } },
      {
        $project: {
          _id: 1, name: 1, voter_name_eng: 1, age: 1, epic_id: 1, srNo: 1, gender: 1, yadi_bhag: 1, part: 1
        }
      }
    ]);

    // Return an object containing both data and total count
    res.status(200).json({
      success: true,
      totalCount: voters.length,
      data: voters
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getDetailedVoter = async (req, res) => {
  try {
    console.log(req.params.epic_id);
    // req.params must match the key in the URL string above (:epic_id)
    const voter = await Voter.findOne({ epic_id: req.params.epic_id });

    if (!voter) return res.status(404).json({ message: "Voter not found" });
    res.json(voter);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

const getBoothWiseReport = async (req, res) => {
  try {
    const report = await Voter.aggregate([
      {
        $project: {
          // Extracting the booth number from strings like "यादी भाग क्र. 285 ..."
          boothNumber: {
            $arrayElemAt: [
              {
                $regexFindAll: {
                  input: { $ifNull: ["$yadi_bhag", ""] },
                  regex: /[0-9]{3}/  // Finds the first 3-digit number (e.g., 285)
                }
              },
              0
            ]
          },
          yadi_bhag: 1
        }
      },
      {
        $group: {
          // Grouping by extracted booth number
          _id: { $ifNull: ["$boothNumber.match", "Unknown Booth"] },
          // Optional: Keep one example area name for context
          areaName: { $first: "$yadi_bhag" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } } // Sort numerically by booth number
    ]);

    const formattedReport = report.map(item => ({
      _id: item._id,
      areaName: item.areaName,
      count: item.count
    }));

    res.status(200).json(formattedReport);
  } catch (error) {
    console.error("Critical Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getPartsByBooth = async (req, res) => {
  try {
    const { boothNumber } = req.params; // This is "285"

    if (!boothNumber) {
      return res.status(400).json({ success: false, message: "Booth number is required" });
    }

    // REGEX: Looks for "/285/" inside "134/285/1" to ensure exact match
    // escaping slashes is important
    const regexPattern = `/${boothNumber}/`;

    const parts = await Voter.aggregate([
      { 
        $match: { 
           // Match strictly based on the 'part' field structure "AC/Booth/Part"
           part: { $regex: regexPattern }
        } 
      },
      {
        $group: {
          _id: "$yadi_bhag", // Group by the full string "यादी भाग क्र. 285 1 - ..."
          count: { $sum: 1 } // Count voters in this specific part
        }
      },
      { $sort: { _id: 1 } } // Sort alphabetically
    ]);

    res.status(200).json({
      success: true,
      data: parts
    });

  } catch (error) {
    console.error("❌ Error fetching booth parts:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// GET: /reports/voters-by-yadi?yadiString=...
const getVotersByYadi = async (req, res) => {
  try {
    // We use query parameter because the string contains spaces and special chars
    const { yadiString } = req.query; 

    if (!yadiString) {
      return res.status(400).json({ success: false, message: "Yadi string is required" });
    }

    const voters = await Voter.find({ yadi_bhag: yadiString })
      .sort({ srNo: 1 }) // Sort by Serial Number (1, 2, 3...)
      .select('name voter_name_eng epic_id age gender srNo house relative_name_eng mobile colorCode isVoted');

    res.status(200).json({
      success: true,
      count: voters.length,
      data: voters
    });

  } catch (error) {
    console.error("❌ Error fetching voters:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getMobileReport = async (req, res) => {
  try {
    const { booth } = req.query;
    let matchStage = { 
      mobile: { $ne: null, $exists: true, $nin: ["", "null", "undefined"] } 
    };

    if (booth && booth !== "All") {
      matchStage.part = { $regex: booth, $options: 'i' };
    }

    const report = await Voter.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            mobile: "$mobile",
            booth: "$part"
          },
          count: { $sum: 1 },
          voterName: { $first: "$name" } // Gets the primary name for this number
        }
      },
      { $sort: { count: -1 } } 
    ]);

    const formattedData = report.map(item => ({
      id: `${item._id.mobile}-${item._id.booth}`, 
      mobile: String(item._id.mobile),
      booth: item._id.booth,
      voterName: item.voterName,
      count: item.count
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
};

module.exports = {
  getGenderAnalysis, getAlphabeticalList, getBoothAnalysis, getColorReport, getSurnameReport, getBirthdayReport, getAgeAnalysis, getCommunityReport, getSchemeAnalysis, getAgeRangeReport,
  getDetailedVoter, getBoothWiseReport, getPartsByBooth, getVotersBySurname, getVotersByYadi, getMobileReport
};