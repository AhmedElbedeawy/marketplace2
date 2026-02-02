const mongoose = require('mongoose');

const userContactHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['email', 'phone'],
    required: true
  },
  value: {
    type: String,
    required: true,
    trim: true,
    lowercase: function() {
      return this.type === 'email' ? true : false;
    }
  },
  status: {
    type: String,
    enum: ['reserved', 'released'],
    default: 'reserved',
    required: true
  },
  releasedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for fast uniqueness check
userContactHistorySchema.index({ type: 1, value: 1, status: 1 });
userContactHistorySchema.index({ userId: 1 });

module.exports = mongoose.model('UserContactHistory', userContactHistorySchema);
