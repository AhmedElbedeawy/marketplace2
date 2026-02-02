const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createOrUpdateOrderRating,
  getOrderRatingStatus,
  getOrderRating,
  getPendingRatingReminders,
  markReminderShown,
  replyToRating
} = require('../controllers/ratingController');

// @route   POST /api/ratings/order/:orderId
// @desc    Create or update rating for a completed order
// @access  Private (Customer only)
router.post('/order/:orderId', protect, createOrUpdateOrderRating);

// @route   GET /api/ratings/order/:orderId/status
// @desc    Get rating status for an order (can rate?, already rated?)
// @access  Private
router.get('/order/:orderId/status', protect, getOrderRatingStatus);

// @route   GET /api/ratings/order/:orderId
// @desc    Get existing rating for an order
// @access  Private
router.get('/order/:orderId', protect, getOrderRating);

// @route   GET /api/ratings/pending-reminders
// @desc    Get orders that need rating reminders (12-24 hours after completion)
// @access  Private
router.get('/pending-reminders', protect, getPendingRatingReminders);

// @route   POST /api/ratings/order/:orderId/reminder-shown
// @desc    Mark rating reminder as shown for an order
// @access  Private
router.post('/order/:orderId/reminder-shown', protect, markReminderShown);

// @route   POST /api/ratings/:ratingId/reply
// @desc    Cook reply to a rating
// @access  Private (Cook only)
router.post('/:ratingId/reply', protect, replyToRating);

module.exports = router;
