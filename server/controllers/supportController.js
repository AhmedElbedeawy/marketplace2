const User = require('../models/User');
const { createNotification } = require('../utils/notifications');
const mongoose = require('mongoose');

/**
 * @desc    Send a direct support message to a user
 * @route   POST /api/support/messages
 * @access  Private/Admin
 */
exports.sendSupportMessage = async (req, res) => {
  try {
    const { userId, message, threadId } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        success: false,
        message: 'User ID and message are required'
      });
    }

    const recipient = await User.findById(userId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // In a full implementation, we would save the message to a SupportMessage collection
    // For Phase 2, we just trigger the notification as requested.
    
    // NOTIFY RECIPIENT: You have a new support message
    try {
      // Ensure entityId is a valid ObjectId (fallback to userId if threadId is missing/invalid)
      const validEntityId = threadId && mongoose.Types.ObjectId.isValid(threadId) 
        ? new mongoose.Types.ObjectId(threadId) 
        : recipient._id;

      await createNotification({
        userId: recipient._id,
        role: recipient.role === 'cook' ? 'cook' : 'foodie',
        title: 'New Support Message',
        message: 'You have a new support message.',
        type: 'support_message',
        entityType: 'support_thread',
        entityId: validEntityId,
        deepLink: `/support/messages/${threadId || 'new'}`
      });
    } catch (notifErr) {
      console.error('Error sending support message notification:', notifErr);
    }

    res.status(200).json({
      success: true,
      message: 'Support message sent and recipient notified'
    });
  } catch (error) {
    console.error('Send support message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending support message'
    });
  }
};
