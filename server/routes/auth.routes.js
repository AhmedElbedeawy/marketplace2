const express = require('express');
const router = express.Router();
const { registerUser, loginUser, becomeCook } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.route('/become-cook').post(protect, becomeCook);

module.exports = router;