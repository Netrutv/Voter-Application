const mongoose = require("mongoose");

const voterSchema = new mongoose.Schema(
    {
        // --- BASIC DATA FROM OFFICIAL RECORDS ---
        mahanagarpalika: {
            type: String,
            trim: true,
        },
        parbhag: {
            type: String,
            trim: true,
        },
        yadi_bhag: {
            type: String,
            trim: true,
        },
        srNo: {
            type: Number,
        },
        epic_id: {
            type: String,
            unique: true,
            required: true,
            uppercase: true,
            trim: true,
        },
        part: {
            type: String,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        voter_name: {
            type: String,
            trim: true,
        },
        age: {
            type: Number,
        },
        gender: {
            type: String,
            enum: ["Male", "Female", "Other", "M", "F"],
        },
        fatherName: {
            type: String,
            trim: true,
        },
        relative_type: {
            type: String,
            trim: true,
        },
        voter_name_eng: {
            type: String,
            trim: true,
        },
        relative_name_eng: {
            type: String,
            trim: true,
        },

        // --- SURVEY & FIELD MANAGEMENT FIELDS ---
        mobile: {
            type: String,
            trim: true,
            default: "",
        },
        mobile2: {
            type: String,
            trim: true,
            default: "",
        },
        colorCode: {
            type: String,
            default: "#ddd", // Default color for unassigned category
        },
        caste: {
            type: String,
            trim: true,
            default: "",
        },
        designation: {
            type: String,
            trim: true,
            default: "",
        },
        isWorker: {
            type: Boolean,
            default: false,
        },
        newAddress: {
            type: String,
            trim: true,
            default: "",
        },
        society: {
            type: String,
            trim: true,
            default: "",
        },
        flatNo: {
            type: String,
            trim: true,
            default: "",
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            default: "",
        },
        dob: {
            type: String,
            default: "",
        },
        demands: {
            type: String,
            trim: true,
            default: "",
        },

        // Additional Info fields (अधिक माहिती १-५ from UI)
        extra1: { type: String, default: "" },
        extra2: { type: String, default: "" },
        extra3: { type: String, default: "" },
        extra4: { type: String, default: "" },
        extra5: { type: String, default: "" },

        // Additional Check fields (अधिक चेक १-२ from UI)
        check1: { type: Boolean, default: false },
        check2: { type: Boolean, default: false },

        // --- STATUS TOGGLES ---
        isDead: {
            type: Boolean,
            default: false,
        },
        isStar: {
            type: Boolean,
            default: false,
        },
        isVoted: {
            type: Boolean,
            default: false,
        },

        // --- TRACKING & METADATA ---
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        lastModified: { type: Number, default: Date.now }, // 🆕 For Sync
        isDeleted: { type: Boolean, default: false }
    },
    {
        timestamps: true, // Automatically creates createdAt and updatedAt fields
    },
);

// Indexing for faster searches by EPIC ID and Name
// voterSchema.index({ epic_id: 1 });
voterSchema.index({ name: "text" });
voterSchema.index({ isDeleted: 1 }); 
voterSchema.index({ lastModified: -1 });

voterSchema.pre('save', function(next) {
    this.lastModified = Date.now();
    next();
});

module.exports = mongoose.model("Voter", voterSchema, "Voters");
