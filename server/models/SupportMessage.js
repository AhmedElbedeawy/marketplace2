const mongoose = require('mongoose');

/**
 * SupportMessage — stores user ↔ Support Team chat messages.
 *
 * Each document belongs to one user (userId). senderRole distinguishes
 * whether the user or the admin wrote the message. This keeps all messages
 * for a user in one flat collection, queryable as a single thread.
 *
 * Separate from the Message model (user↔user) to avoid permission conflicts.
 */
const supportMessageSchema = new mongoose.Schema(
  {
    userId: {
      // The customer/cook user this conversation belongs to
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters']
    },
    senderRole: {
      // 'user'  = sent by the customer/cook
      // 'admin' = sent by the Support Team
      type: String,
      enum: ['user', 'admin'],
      required: true,
      default: 'user'
    },
    isReadByAdmin: {
      // true once an admin has opened the thread and read the message
      type: Boolean,
      default: false
    },
    isReadByUser: {
      // true once the user has seen this admin reply
      // user messages default to true (they obviously read what they typed)
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Efficient queries for a user's thread and unread counts
supportMessageSchema.index({ userId: 1, createdAt: 1 });
supportMessageSchema.index({ userId: 1, isReadByAdmin: 1 });
supportMessageSchema.index({ senderRole: 1, isReadByAdmin: 1 });

module.exports = mongoose.model('SupportMessage', supportMessageSchema);
