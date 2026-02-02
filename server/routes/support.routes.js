const express = require('express');
const router = express.Router();
const { sendSupportMessage } = require('../controllers/supportController');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/support/messages
// @desc    Send a direct support message to a user
// @access  Private (Admin only for now)
router.post('/messages', protect, authorize('admin', 'super_admin'), sendSupportMessage);

module.exports = router;
