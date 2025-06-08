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
    enum: ['message', 'group_invite', 'friend_request', 'mention', 'reaction'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  relatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'onModel'
  },
  onModel: {
    type: String,
    enum: ['Message', 'Group', 'User']
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

// Method to mark notification as read
notificationSchema.methods.markAsRead = async function() {
  this.read = true;
  return this.save();
};

// Static method to create a notification
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();
  return notification;
};

// Static method to get unread notifications count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ recipient: userId, read: false });
};

// Static method to get user's notifications
notificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
  const { limit = 20, skip = 0, unreadOnly = false } = options;
  
  const query = { recipient: userId };
  if (unreadOnly) {
    query.read = false;
  }

  return this.find(query)
    .populate('sender', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to mark all notifications as read
notificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { recipient: userId, read: false },
    { $set: { read: true } }
  );
};

// Static method to delete old notifications
notificationSchema.statics.deleteOldNotifications = async function(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  
  return this.deleteMany({
    createdAt: { $lt: date },
    read: true
  });
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification; 