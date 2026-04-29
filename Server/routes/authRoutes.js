const express = require('express');
const router = express.Router();
const { loginVoter, registerVoter } = require('../controllers/authController');

// POST: /api/auth/register
router.post('/register', registerVoter);

// POST: /api/auth/login
router.post('/login', loginVoter);

module.exports = router;