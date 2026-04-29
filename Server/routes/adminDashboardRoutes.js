const express = require("express");
const router = express.Router();
const { getSurveyStats, getWorkerDetails, getVoters, getBoothStats, getSyncData, getAreaStats } = require("../controllers/adminDashboardController");

// Route for analytics dashboard
router.get("/stats", getSurveyStats);
router.get("/worker-details/:userId", getWorkerDetails);
router.get("/voters", getVoters);
router.get("/booth-stats", getBoothStats);
router.get("/sync", getSyncData);
router.get('/area-stats', getAreaStats);

module.exports = router;