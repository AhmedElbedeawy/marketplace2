const express = require('express');
const router = express.Router();
const { registerUser, loginUser, socialLogin, becomeCook, demoBypass, demoLogin } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.route('/social-login').post(socialLogin);
router.route('/become-cook').post(protect, becomeCook);

// DEMO ROUTES - DISABLED FOR PRODUCTION
// router.route('/demo-bypass').post(protect, demoBypass);
// router.route('/demo-login').post(demoLogin);

module.exports = router;