const express = require('express');
const router = express.Router();
const { getAllVoters, seedVoters, getVoterById, updateVoter, getFamilyMembers } = require('../controllers/voterController');

router.get('/voters/family', getFamilyMembers);
router.get('/voters', getAllVoters);
router.post('/seed', seedVoters); 
router.get('/voters/:id', getVoterById);
router.put('/voters/:id', updateVoter);

module.exports = router;