const SupportMessage = require('../models/SupportMessage');
const User = require('../models/User');
const { createNotification } = require('../utils/notifications');
const mongoose = require('mongoose');

// ── User endpoints ─────────────────────────────────────────────────────────

/**
 * POST /api/support/thread/message
 * Authenticated user sends a support message.
 * Creates a SupportMessage with senderRole='user'.
 */
exports.sendUserSupportMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, message: 'Message body is required' });
    }

    const message = await SupportMessage.create({
      userId,
      body: body.trim(),
      senderRole: 'user',
      isReadByAdmin: false,
      isReadByUser: true
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('[sendUserSupportMessage]', error);
    res.status(500).json({ success: false, message: 'Failed to send support message' });
  }
};

/**
 * GET /api/support/thread
 * Authenticated user fetches their full support conversation history.
 * Returns messages in chronological order + unread count of admin replies.
 */
exports.getUserSupportThread = async (req, res) => {
  try {
    const userId = req.user._id;

    const messages = await SupportMessage.find({ userId }).sort({ createdAt: 1 }).lean();

    const unreadCount = messages.filter(
      m => m.senderRole === 'admin' && !m.isReadByUser
    ).length;

    res.json({ success: true, data: { messages, unreadCount } });
  } catch (error) {
    console.error('[getUserSupportThread]', error);
    res.status(500).json({ success: false, message: 'Failed to get support thread' });
  }
};

/**
 * PATCH /api/support/thread/read
 * User marks all admin replies in their thread as read.
 */
exports.markSupportThreadReadByUser = async (req, res) => {
  try {
    const userId = req.user._id;

    await SupportMessage.updateMany(
      { userId, senderRole: 'admin', isReadByUser: false },
      { isReadByUser: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[markSupportThreadReadByUser]', error);
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
};

// ── Admin endpoints ────────────────────────────────────────────────────────

/**
 * GET /api/support/admin/threads
 * Admin lists all support threads — one per user, sorted by last activity.
 * Returns: userId, user info, last message preview, unread count.
 */
exports.getAllSupportThreads = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Aggregate: group messages by user, get last message + unread count
    const threads = await SupportMessage.aggregate([
      {
        $group: {
          _id: '$userId',
          lastMessage: { $last: '$body' },
          lastSenderRole: { $last: '$senderRole' },
          lastMessageAt: { $last: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$senderRole', 'user'] }, { $eq: ['$isReadByAdmin', false] }] },
                1,
                0
              ]
            }
          },
          totalMessages: { $sum: 1 }
        }
      },
      { $sort: { lastMessageAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    // Total distinct users for pagination
    const totalResult = await SupportMessage.aggregate([
      { $group: { _id: '$userId' } },
      { $count: 'total' }
    ]);
    const total = totalResult[0]?.total || 0;

    // Populate user info
    const userIds = threads.map(t => t._id).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id name email role role_cook_status storeName')
      .lean();

    const userMap = {};
    for (const u of users) userMap[u._id.toString()] = u;

    const enriched = threads.map(t => {
      const user = userMap[t._id?.toString()];
      const isCook = user?.role_cook_status === 'active';
      return {
        userId: t._id,
        user: user
          ? {
              name: user.name || 'Unknown',
              email: user.email || '',
              role: isCook ? 'cook' : 'foodie',
              storeName: user.storeName || null
            }
          : { name: 'Unknown', email: '', role: 'unknown', storeName: null },
        lastMessage: t.lastMessage,
        lastSenderRole: t.lastSenderRole,
        lastMessageAt: t.lastMessageAt,
        unreadCount: t.unreadCount,
        totalMessages: t.totalMessages
      };
    });

    res.json({
      success: true,
      data: {
        threads: enriched,
        pagination: { page: parseInt(page), limit: parseInt(limit), total }
      }
    });
  } catch (error) {
    console.error('[getAllSupportThreads]', error);
    res.status(500).json({ success: false, message: 'Failed to get support threads' });
  }
};

/**
 * GET /api/support/admin/threads/:userId
 * Admin fetches the full thread for a specific user.
 * Also marks all user messages as read by admin.
 */
exports.getUserSupportThreadAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const user = await User.findById(userId)
      .select('_id name email role role_cook_status storeName')
      .lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const messages = await SupportMessage.find({ userId }).sort({ createdAt: 1 }).lean();

    // Mark user messages as read by admin (non-blocking — don't await)
    SupportMessage.updateMany(
      { userId, senderRole: 'user', isReadByAdmin: false },
      { isReadByAdmin: true }
    ).catch(err => console.error('[getUserSupportThreadAdmin] markRead failed:', err));

    const isCook = user.role_cook_status === 'active';

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: isCook ? 'cook' : 'foodie',
          storeName: user.storeName || null
        },
        messages
      }
    });
  } catch (error) {
    console.error('[getUserSupportThreadAdmin]', error);
    res.status(500).json({ success: false, message: 'Failed to get user support thread' });
  }
};

/**
 * POST /api/support/admin/threads/:userId/reply
 * Admin sends a reply to a user's support thread.
 * Notifies the user.
 */
exports.adminReplyToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { body } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, message: 'Reply body is required' });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const message = await SupportMessage.create({
      userId,
      body: body.trim(),
      senderRole: 'admin',
      isReadByAdmin: true,
      isReadByUser: false
    });

    // Notify user — non-fatal
    try {
      await createNotification({
        userId: user._id,
        title: 'Support Team Reply',
        message: 'You have a new reply from the Support Team.',
        type: 'support_message',
        entityType: 'support_thread',
        entityId: message._id,
        deepLink: '/support/messages'
      });
    } catch (notifErr) {
      console.error('[adminReplyToUser] Notification failed (non-fatal):', notifErr.message);
    }

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('[adminReplyToUser]', error);
    res.status(500).json({ success: false, message: 'Failed to send reply' });
  }
};

/**
 * PATCH /api/support/admin/threads/:userId/read
 * Admin marks all user messages in a thread as read.
 */
exports.markSupportThreadReadByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    await SupportMessage.updateMany(
      { userId, senderRole: 'user', isReadByAdmin: false },
      { isReadByAdmin: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[markSupportThreadReadByAdmin]', error);
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
};

// ── Legacy: kept for backward compatibility ────────────────────────────────

/**
 * POST /api/support/messages   (admin → user notification only, no persistence)
 * @access Admin only
 */
exports.sendSupportMessage = async (req, res) => {
  try {
    const { userId, message, threadId } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ success: false, message: 'User ID and message are required' });
    }

    const recipient = await User.findById(userId);
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    try {
      const validEntityId =
        threadId && mongoose.Types.ObjectId.isValid(threadId)
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

    res.status(200).json({ success: true, message: 'Support message sent and recipient notified' });
  } catch (error) {
    console.error('Send support message error:', error);
    res.status(500).json({ success: false, message: 'Error sending support message' });
  }
};
