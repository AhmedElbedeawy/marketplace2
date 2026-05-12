const Order = require('../models/Order');
const User = require('../models/User');
const Message = require('../models/Message');
const mongoose = require('mongoose');
const { createNotification } = require('../utils/notifications');

/**
 * Get messaging contacts connected through order history.
 *
 * Root cause fix: User.role is always 'foodie' (enum: ['foodie','admin','super_admin']).
 * There is no 'cook' or 'customer' value in User.role. Cook identity is tracked via
 * User.role_cook_status === 'active'. The old code queried User.find({ role: 'cook' })
 * which always returned 0 results.
 *
 * Policy (unchanged):
 *   Foodie → can message cooks they have ordered from (Order.customer = userId, subOrders.cook)
 *   Cook   → can message foodies who ordered from them (subOrders.cook = userId, Order.customer)
 *   Foodie↔Foodie and Cook↔Cook: not returned (implicit via order graph)
 *
 * GET /api/messages/contacts
 * Query params: search (string), limit (number, default 20)
 */
const getTransactionContacts = async (req, res) => {
  try {
    const userId = req.user._id;
    // Distinguish cook from foodie using role_cook_status, not User.role
    const isCook = req.user.role_cook_status === 'active';
    const { search = '', limit = 20 } = req.query;

    let contactUserIds = [];

    if (isCook) {
      // Cook: collect all unique foodies (Order.customer) from orders where this cook appears.
      // subOrders.cook is a Mixed field — query with both ObjectId and string to handle legacy data.
      const orders = await Order.find(
        { 'subOrders.cook': { $in: [userId, userId.toString()] } },
        { customer: 1, _id: 0 }
      ).lean();
      const seen = new Set();
      for (const o of orders) {
        if (o.customer) seen.add(o.customer.toString());
      }
      contactUserIds = [...seen];
    } else {
      // Foodie: collect all unique cooks (subOrders.cook) from this foodie's orders
      const orders = await Order.find(
        { customer: userId },
        { 'subOrders.cook': 1, _id: 0 }
      ).lean();
      const seen = new Set();
      for (const o of orders) {
        for (const sub of (o.subOrders || [])) {
          if (sub.cook) seen.add(sub.cook.toString());
        }
      }
      contactUserIds = [...seen];
    }

    if (contactUserIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Convert to ObjectIds for the $in query
    const objectIds = contactUserIds
      .map(id => {
        try { return new mongoose.Types.ObjectId(id); } catch (_) { return null; }
      })
      .filter(Boolean);

    // After conversion some IDs may have been filtered (invalid). Guard against empty array.
    if (objectIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Build user query — exclude self just in case
    const userQuery = { $and: [{ _id: { $in: objectIds } }, { _id: { $ne: userId } }] };

    // Optional search filter
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      userQuery.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { storeName: searchRegex }
      ];
    }

    const contacts = await User.find(userQuery)
      .select('_id name email role role_cook_status storeName')
      .limit(parseInt(limit))
      .sort({ name: 1 });

    res.json({
      success: true,
      data: contacts.map(contact => {
        const isContactCook = contact.role_cook_status === 'active';
        const displayName = contact.storeName || contact.name;
        return {
          _id: contact._id,
          name: displayName,
          email: contact.email,
          role: isContactCook ? 'cook' : 'foodie',
          label: `${displayName} (${isContactCook ? 'Kitchen' : 'Foodie'})`,
          value: contact._id.toString()
        };
      })
    });
  } catch (error) {
    console.error('Error getting contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contacts',
      error: error.message
    });
  }
};

/**
 * Send a message to another user
 * POST /api/messages/send
 * Body: { recipientId, subject, body, contextType?, contextId? }
 * Context types: 'cook_contact', 'dish_contact', 'order_contact'
 */
const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { recipientId, subject, body, contextType, contextId } = req.body;

    // Validation — subject is optional; body and recipientId are required
    if (!recipientId || !body?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Recipient and body are required'
      });
    }

    // Block sending to self
    if (recipientId === senderId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send message to yourself'
      });
    }

    // Verify recipient exists
    const recipient = await User.findById(recipientId).select('_id name');
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // Check if sender can message recipient
    const canMessage = await validateMessagingPermission(senderId, recipientId, contextType, contextId);
    if (!canMessage.allowed) {
      return res.status(403).json({
        success: false,
        message: canMessage.reason || 'You are not authorized to message this user'
      });
    }

    // Create message — subject is optional, fall back to empty string placeholder
    const message = await Message.create({
      sender: senderId,
      recipient: recipientId,
      subject: subject?.trim() || '(no subject)',
      body: body.trim()
    });

    // Create notification for recipient — non-blocking, failure must not crash send
    try {
      await createNotification({
        userId: recipientId,
        title: 'New Message',
        message: `You have a new message from ${req.user.name}`,
        type: 'support_message',
        entityType: 'support_thread',
        entityId: message._id,
        deepLink: '/foodie/messages'
      });
    } catch (notifErr) {
      console.error('[sendMessage] Notification failed (non-fatal):', notifErr.message);
    }

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

/**
 * Validate if sender can message recipient.
 *
 * Cook identity: User.role is NEVER 'cook'. Cooks have role='foodie' with
 * role_cook_status='active' (and isCook=true). Never use role === 'cook'.
 *
 * Rules:
 *   Admin → anyone: allowed
 *   Foodie → Cook:  allowed if existing order/conversation, or contextType='contact_cook'
 *   Cook → Foodie:  allowed if existing order/conversation
 *   Same type:      blocked
 *
 * @returns {{ allowed: boolean, reason?: string }}
 */
const validateMessagingPermission = async (senderId, recipientId, contextType, contextId) => {
  try {
    const [sender, recipient] = await Promise.all([
      User.findById(senderId).select('role role_cook_status isCook').lean(),
      User.findById(recipientId).select('role role_cook_status isCook').lean(),
    ]);

    if (!sender || !recipient) {
      return { allowed: false, reason: 'Invalid sender or recipient' };
    }

    // Admin / super_admin can message anyone
    if (sender.role === 'admin' || sender.role === 'super_admin') {
      return { allowed: true };
    }

    // Cook identity: role_cook_status='active' OR isCook=true
    const senderIsCook = sender.role_cook_status === 'active' || sender.isCook === true;
    const recipientIsCook = recipient.role_cook_status === 'active' || recipient.isCook === true;

    // Check for existing relationship (order OR previous conversation)
    const recipientIdStr = recipientId.toString();
    const senderIdStr = senderId.toString();

    const [hasOrder, hasConversation] = await Promise.all([
      Order.exists({
        $or: [
          { customer: senderId,    'subOrders.cook': { $in: [recipientId, recipientIdStr] } },
          { customer: recipientId, 'subOrders.cook': { $in: [senderId,    senderIdStr]    } },
        ],
      }),
      Message.exists({
        $or: [
          { sender: senderId,    recipient: recipientId },
          { sender: recipientId, recipient: senderId    },
        ],
      }),
    ]);

    const hasExistingRelationship = !!(hasOrder || hasConversation);

    // Foodie → Cook
    if (!senderIsCook && recipientIsCook) {
      const isContactCookFlow = contextType === 'contact_cook';
      if (hasExistingRelationship || isContactCookFlow) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Order from this cook to message them' };
    }

    // Cook → Foodie
    if (senderIsCook && !recipientIsCook) {
      if (hasExistingRelationship) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'You can only message foodies you have an order with' };
    }

    // Same type (Foodie↔Foodie or Cook↔Cook) — not allowed
    return { allowed: false, reason: 'Messaging not allowed between these user types' };

  } catch (error) {
    console.error('[validateMessagingPermission] error:', error.message);
    // On error, fail closed — deny the message
    return { allowed: false, reason: 'Permission check failed' };
  }
};

/**
 * Check if two users have had transaction history (kept for reference)
 * Note: Transaction history is no longer required for messaging
 */
const checkTransactionHistory = async (userId1, userId2) => {
  // Transaction history check removed - messaging is now role-based
  // This function is kept for potential future use
  return false;
};

/**
 * Get inbox - latest conversation per user
 * GET /api/messages/inbox
 * Query: page, limit
 */
const getInbox = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    // Get all messages where user is sender or recipient
    const messages = await Message.find({
      $or: [{ sender: userId }, { recipient: userId }]
    })
      .populate('sender', 'name email role')
      .populate('recipient', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    console.log(`[getInbox] User ${userId} has ${messages.length} messages in current page`);
    
    // Group by conversation partner
    const conversations = new Map();
    
    messages.forEach(msg => {
      // Safety check: skip if sender or recipient is null (populate failed)
      if (!msg.sender || !msg.recipient) {
        console.warn(`[getInbox] Message ${msg._id} has missing sender or recipient, skipping`);
        return;
      }
      
      const partnerId = msg.sender._id.toString() === userId.toString() 
        ? msg.recipient._id.toString() 
        : msg.sender._id.toString();
      
      if (!conversations.has(partnerId)) {
        conversations.set(partnerId, {
          partner: msg.sender._id.toString() === userId.toString() ? msg.recipient : msg.sender,
          lastMessage: msg,
          unreadCount: msg.recipient._id.toString() === userId.toString() && !msg.isRead ? 1 : 0
        });
      } else {
        const conv = conversations.get(partnerId);
        if (msg.recipient._id.toString() === userId.toString() && !msg.isRead) {
          conv.unreadCount++;
        }
      }
    });

    console.log(`[getInbox] User ${userId} has ${conversations.size} conversations`);
    
    const total = await Message.countDocuments({
      $or: [{ sender: userId }, { recipient: userId }]
    });

    console.log(`[getInbox] User ${userId} total messages: ${total}`);

    res.json({
      success: true,
      data: {
        conversations: Array.from(conversations.values()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting inbox:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inbox',
      error: error.message
    });
  }
};

/**
 * Get conversation with a specific user
 * GET /api/messages/conversation/:userId
 * Query: page, limit
 */
const getConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const partnerId = req.params.userId;
    const { page = 1, limit = 20 } = req.query;

    // Verify partner exists
    const partner = await User.findById(partnerId).select('name email role');
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get messages between these two users
    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: partnerId },
        { sender: partnerId, recipient: userId }
      ]
    })
      .populate('sender', 'name email role')
      .populate('recipient', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Message.countDocuments({
      $or: [
        { sender: userId, recipient: partnerId },
        { sender: partnerId, recipient: userId }
      ]
    });

    res.json({
      success: true,
      data: {
        partner,
        messages: messages.reverse(), // Oldest first
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversation',
      error: error.message
    });
  }
};

/**
 * Mark messages as read
 * PATCH /api/messages/read/:senderId
 */
const markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const senderId = req.params.senderId;

    const result = await Message.updateMany(
      {
        sender: senderId,
        recipient: userId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      message: 'Messages marked as read',
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read',
      error: error.message
    });
  }
};

/**
 * Resolve user info for message prefill
 * GET /api/messages/resolve-user/:userId
 * Used when recipient is not in transaction contacts but context allows messaging
 */
const resolveUserForPrefill = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('_id name email role');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        label: `${user.name} (${user.role === 'cook' ? 'Kitchen' : 'Foodie'})`,
        value: user._id.toString()
      }
    });
  } catch (error) {
    console.error('Error resolving user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve user',
      error: error.message
    });
  }
};

module.exports = {
  getTransactionContacts,
  resolveUserForPrefill,
  sendMessage,
  getInbox,
  getConversation,
  markAsRead
};
