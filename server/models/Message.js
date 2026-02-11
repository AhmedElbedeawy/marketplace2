const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  body: {
    type: String,
    required: true,
    trim: true,
    maxlength: [5000, 'Message cannot exceed 5000 characters']
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  parentMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, createdAt: -1 });
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
