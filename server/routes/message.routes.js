const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getTransactionContacts,
  sendMessage,
  getInbox,
  getConversation,
  markAsRead,
  resolveUserForPrefill
} = require('../controllers/messageController');

// All routes require authentication
router.use(protect);

// Get transaction contacts for messaging
router.get('/contacts', getTransactionContacts);

// Resolve user info for prefill (when recipient not in contacts)
router.get('/resolve-user/:userId', resolveUserForPrefill);

// Send a message
router.post('/send', sendMessage);

// Get inbox (conversations)
router.get('/inbox', getInbox);

// Get conversation with specific user
router.get('/conversation/:userId', getConversation);

// Mark messages from a sender as read
router.patch('/read/:senderId', markAsRead);

module.exports = router;
