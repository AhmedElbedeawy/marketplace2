const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: [
      'approve', 
      'reject', 
      'suspend', 
      'unsuspend', 
      'delete_cook', 
      'bulk_update_cooks', 
      'bulk_delete_cooks',
      'update_cook_profile',
      'change_email',
      'change_phone'
    ],
    required: true
  },
  reason: {
    type: String,
    trim: true
  },
  metadata: {
    type: Object
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
