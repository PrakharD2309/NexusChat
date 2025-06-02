const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: [
      'login',
      'logout',
      'message_sent',
      'message_edited',
      'message_deleted',
      'message_archived',
      'message_unarchived',
      'group_created',
      'group_joined',
      'group_left',
      'group_settings_updated',
      'profile_updated',
      'settings_updated',
      'file_uploaded',
      'file_deleted'
    ],
    required: true
  },
  details: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
userActivitySchema.index({ user: 1, createdAt: -1 });
userActivitySchema.index({ action: 1 });
userActivitySchema.index({ createdAt: 1 });

module.exports = mongoose.model('UserActivity', userActivitySchema); 