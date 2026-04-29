const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Define report routes
router.get('/gender', reportController.getGenderAnalysis);
// Add this new route
router.get('/list/alphabetical', reportController.getAlphabeticalList);

// Future routes can go here:
// router.get('/age', reportController.getAgeAnalysis);

// router.get('/booth', reportController.getBoothAnalysis);

router.get('/color', reportController.getColorReport);

router.get('/surname', reportController.getSurnameReport);

router.get('/birthday', reportController.getBirthdayReport);

router.get('/age', reportController.getAgeAnalysis);

router.get('/community', reportController.getCommunityReport);

router.get('/schemes', reportController.getSchemeAnalysis);

router.get('/age-range', reportController.getAgeRangeReport);

router.get('/voters/:epic_id', reportController.getDetailedVoter);

router.get('/booth', reportController.getBoothWiseReport);

// router.get('/voters-by-booth', reportController.getYadisByBooth);
router.get('/booth-parts/:boothNumber', reportController.getPartsByBooth);

router.get('/surname-details', reportController.getVotersBySurname);

// Note: We use query params here, not path params, to handle the complex string safely
router.get('/voters-by-yadi', reportController.getVotersByYadi);

router.get('/mobile-summary', reportController.getMobileReport);

module.exports = router;