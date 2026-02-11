const Order = require('../models/Order');
const User = require('../models/User');
const Message = require('../models/Message');
const mongoose = require('mongoose');

/**
 * Get discoverable contacts for messaging
 * Discovery policy: Foodies can discover cooks, Cooks can discover foodies
 * Same-role users are NOT discoverable (prevents random user browsing)
 * GET /api/messages/contacts
 * Query params: search (string), limit (number, default 20)
 */
const getTransactionContacts = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { search = '', limit = 20 } = req.query;

    // Discovery restriction based on role
    // Foodie can discover cooks (but not other foodies)
    // Cook can discover foodies (but not other cooks)
    let discoverableRole;
    if (userRole === 'foodie' || userRole === 'customer') {
      discoverableRole = 'cook';
    } else if (userRole === 'cook') {
      discoverableRole = 'customer'; // foodies
    } else {
      // Admin can discover all
      discoverableRole = null;
    }

    // Build query for discoverable users
    const userQuery = {
      _id: { $ne: userId } // Exclude self
    };

    // Apply role filter for non-admins
    if (discoverableRole) {
      userQuery.role = discoverableRole;
    }

    // Add search filter if provided
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      userQuery.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { storeName: searchRegex }
      ];
    }

    // Fetch users with minimal fields
    const contacts = await User.find(userQuery)
      .select('_id name email role storeName')
      .limit(parseInt(limit))
      .sort({ name: 1 });

    res.json({
      success: true,
      data: contacts.map(contact => ({
        _id: contact._id,
        name: contact.storeName || contact.name,
        email: contact.email,
        role: contact.role,
        label: `${contact.storeName || contact.name} (${contact.role === 'cook' ? 'Kitchen' : 'Foodie'})`,
        value: contact._id.toString()
      }))
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

    // Validation
    if (!recipientId || !subject?.trim() || !body?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Recipient, subject, and body are required'
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

    // Create message
    const message = await Message.create({
      sender: senderId,
      recipient: recipientId,
      subject: subject.trim(),
      body: body.trim()
    });

    // Create notification for recipient
    await createNotification({
      userId: recipientId,
      title: 'New Message',
      message: `You have a new message from ${req.user.name}`,
      type: 'support_message',
      entityType: 'support_thread',
      entityId: message._id,
      deepLink: '/foodie/messages'
    });

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
 * Validate if sender can message recipient
 * Discovery restriction: Foodies cannot discover other foodies via dropdown
 * But sending is allowed through valid entry points (Contact Cook/Foodie)
 * @returns {Object} { allowed: boolean, reason: string? }
 */
const validateMessagingPermission = async (senderId, recipientId, contextType, contextId) => {
  // Get sender and recipient roles
  const sender = await User.findById(senderId).select('role');
  const recipient = await User.findById(recipientId).select('role');
  
  if (!sender || !recipient) {
    return { allowed: false, reason: 'Invalid sender or recipient' };
  }
  
  // Role-based policy:
  // - Foodie can message cooks
  // - Cook can message foodies
  // - Admin can message anyone
  if (sender.role === 'admin') {
    return { allowed: true };
  }
  
  if (sender.role === 'customer' || sender.role === 'foodie') {
    // Foodie can message cooks
    if (recipient.role === 'cook') {
      return { allowed: true };
    }
    // Foodie cannot message other foodies (discovery restriction)
    if (recipient.role === 'customer' || recipient.role === 'foodie') {
      return { allowed: false, reason: 'You can only message cooks' };
    }
  }
  
  if (sender.role === 'cook') {
    // Cook can message foodies
    if (recipient.role === 'customer' || recipient.role === 'foodie') {
      return { allowed: true };
    }
    // Cook cannot message other cooks (discovery restriction)
    if (recipient.role === 'cook') {
      return { allowed: false, reason: 'You can only message foodies' };
    }
  }
  
  // Default deny for unknown role combinations
  return { allowed: false, reason: 'Messaging not allowed between these user types' };
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

    // Group by conversation partner
    const conversations = new Map();
    
    messages.forEach(msg => {
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

    const total = await Message.countDocuments({
      $or: [{ sender: userId }, { recipient: userId }]
    });

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
