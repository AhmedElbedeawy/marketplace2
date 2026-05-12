const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  // New: user ↔ Support Team chat
  sendUserSupportMessage,
  getUserSupportThread,
  markSupportThreadReadByUser,
  // New: admin views and replies
  getAllSupportThreads,
  getUserSupportThreadAdmin,
  adminReplyToUser,
  markSupportThreadReadByAdmin,
  // Legacy: notification-only send (unchanged)
  sendSupportMessage
} = require('../controllers/supportController');

// ── User endpoints (any authenticated user) ────────────────────────────────

// User sends a support message
router.post('/thread/message', protect, sendUserSupportMessage);

// User gets their full support conversation history
router.get('/thread', protect, getUserSupportThread);

// User marks all admin replies as read
router.patch('/thread/read', protect, markSupportThreadReadByUser);

// ── Admin endpoints ────────────────────────────────────────────────────────

// Admin: list all support threads (one per user), sorted by last activity
router.get('/admin/threads', protect, adminOnly, getAllSupportThreads);

// Admin: get full thread for a specific user + mark user messages read
router.get('/admin/threads/:userId', protect, adminOnly, getUserSupportThreadAdmin);

// Admin: reply to a user's thread
router.post('/admin/threads/:userId/reply', protect, adminOnly, adminReplyToUser);

// Admin: mark a user's messages as read
router.patch('/admin/threads/:userId/read', protect, adminOnly, markSupportThreadReadByAdmin);

// ── Legacy ─────────────────────────────────────────────────────────────────

// Admin sends a notification-only message (original behavior — kept for compat)
router.post('/messages', protect, adminOnly, sendSupportMessage);

module.exports = router;
