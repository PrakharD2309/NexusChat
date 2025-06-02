const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: [
      'message',
      'group_invite',
      'friend_request',
      'call',
      'mention',
      'reaction',
      'system',
      'custom'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  // Notification sound
  sound: {
    name: {
      type: String,
      default: 'default'
    },
    url: String,
    volume: {
      type: Number,
      default: 1,
      min: 0,
      max: 1
    }
  },
  // Notification category
  category: {
    type: String,
    enum: [
      'chat',
      'group',
      'call',
      'system',
      'security',
      'custom'
    ],
    default: 'chat'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // Notification delivery
  delivery: {
    channels: [{
      type: String,
      enum: ['push', 'email', 'in_app', 'sms'],
      default: ['in_app']
    }],
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
      default: 'pending'
    },
    attempts: {
      type: Number,
      default: 0
    },
    lastAttempt: Date,
    nextAttempt: Date
  },
  // Notification interaction
  interaction: {
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: Date,
    isClicked: {
      type: Boolean,
      default: false
    },
    clickedAt: Date,
    action: {
      type: String,
      enum: ['none', 'view', 'reply', 'dismiss'],
      default: 'none'
    }
  },
  // Notification grouping
  group: {
    id: String,
    count: {
      type: Number,
      default: 1
    },
    isGrouped: {
      type: Boolean,
      default: false
    }
  },
  // Notification expiration
  expiresAt: Date,
  // Notification preferences
  preferences: {
    doNotDisturb: {
      type: Boolean,
      default: false
    },
    mute: {
      type: Boolean,
      default: false
    },
    muteUntil: Date,
    customSound: String,
    customVibration: String,
    customLight: String
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ recipient: 1 });
notificationSchema.index({ sender: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ category: 1 });
notificationSchema.index({ 'delivery.status': 1 });
notificationSchema.index({ 'interaction.isRead': 1 });
notificationSchema.index({ 'group.id': 1 });
notificationSchema.index({ expiresAt: 1 });

// Methods for notification delivery
notificationSchema.methods.markAsSent = async function() {
  this.delivery.status = 'sent';
  this.delivery.lastAttempt = new Date();
  this.delivery.attempts += 1;
  return this.save();
};

notificationSchema.methods.markAsDelivered = async function() {
  this.delivery.status = 'delivered';
  return this.save();
};

notificationSchema.methods.markAsFailed = async function() {
  this.delivery.status = 'failed';
  this.delivery.lastAttempt = new Date();
  this.delivery.attempts += 1;
  // Schedule next attempt if attempts < 3
  if (this.delivery.attempts < 3) {
    this.delivery.nextAttempt = new Date(Date.now() + Math.pow(2, this.delivery.attempts) * 1000);
  }
  return this.save();
};

// Methods for notification interaction
notificationSchema.methods.markAsRead = async function() {
  if (!this.interaction.isRead) {
    this.interaction.isRead = true;
    this.interaction.readAt = new Date();
    return this.save();
  }
  return this;
};

notificationSchema.methods.markAsClicked = async function(action = 'view') {
  if (!this.interaction.isClicked) {
    this.interaction.isClicked = true;
    this.interaction.clickedAt = new Date();
    this.interaction.action = action;
    return this.save();
  }
  return this;
};

// Methods for notification grouping
notificationSchema.methods.addToGroup = async function(groupId) {
  this.group.id = groupId;
  this.group.isGrouped = true;
  this.group.count += 1;
  return this.save();
};

notificationSchema.methods.removeFromGroup = async function() {
  this.group.id = null;
  this.group.isGrouped = false;
  this.group.count = 1;
  return this.save();
};

// Methods for notification preferences
notificationSchema.methods.setDoNotDisturb = async function(enabled) {
  this.preferences.doNotDisturb = enabled;
  return this.save();
};

notificationSchema.methods.mute = async function(until) {
  this.preferences.mute = true;
  this.preferences.muteUntil = until;
  return this.save();
};

notificationSchema.methods.unmute = async function() {
  this.preferences.mute = false;
  this.preferences.muteUntil = null;
  return this.save();
};

notificationSchema.methods.setCustomSound = async function(sound) {
  this.preferences.customSound = sound;
  return this.save();
};

// Static methods for notification management
notificationSchema.statics.findUnread = function(userId) {
  return this.find({
    recipient: userId,
    'interaction.isRead': false
  }).sort({ createdAt: -1 });
};

notificationSchema.statics.findByGroup = function(groupId) {
  return this.find({
    'group.id': groupId
  }).sort({ createdAt: -1 });
};

notificationSchema.statics.findPending = function() {
  return this.find({
    'delivery.status': 'pending',
    'delivery.nextAttempt': { $lte: new Date() }
  });
};

notificationSchema.statics.findExpired = function() {
  return this.find({
    expiresAt: { $lte: new Date() }
  });
};

module.exports = mongoose.model('Notification', notificationSchema); 