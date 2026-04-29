// const express = require('express');
// const router = express.Router();
// const userController = require('../controllers/userController');
// const { protect, superAdminOnly } = require('../middleware/authMiddleware');

// // New Analytics Route
// router.get('/analytics', userController.getUserAnalytics);
// // GET All Users (Super Admin Only)
// router.get('/', userController.getAllUsers);

// // DELETE User (Super Admin Only)
// router.delete('/:id', userController.deleteUser);
// router.post('/', createUser);     
// router.put('/:id', updateUser);

// module.exports = router;

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// 1. Analytics (Specific routes should go before dynamic routes like /:id)
router.get('/analytics', userController.getUserAnalytics);

// 2. GET All Users
router.get('/', userController.getAllUsers);

// 3. CREATE User (Added userController prefix + Middleware)
router.post('/', userController.createUser);     

// 4. UPDATE User (Added userController prefix + Middleware)
router.put('/:id', userController.updateUser);

// 5. DELETE User
router.delete('/:id', userController.deleteUser);

router.get('/logs', userController.getSystemLogs);

router.get('/phonebook/:userId', userController.getMyPhoneBook);

module.exports = router;