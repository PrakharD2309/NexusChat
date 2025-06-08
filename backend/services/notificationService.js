const Notification = require('../models/Notification');
const User = require('../models/User');
const socketService = require('./socketService');

class NotificationService {
  // Create a new notification
  static async createNotification(data) {
    try {
      const notification = await Notification.createNotification(data);
      
      // Emit notification to recipient
      socketService.emitToUser(notification.recipient, 'notification', notification);
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Create message notification
  static async createMessageNotification(message) {
    const recipient = message.recipient || message.group;
    if (!recipient) return null;

    const notification = await this.createNotification({
      recipient: recipient,
      sender: message.sender,
      type: 'message',
      content: `New message from ${message.sender.name}`,
      relatedTo: message._id,
      onModel: 'Message'
    });

    return notification;
  }

  // Create group invite notification
  static async createGroupInviteNotification(group, invitedBy, invitedUser) {
    const notification = await this.createNotification({
      recipient: invitedUser,
      sender: invitedBy,
      type: 'group_invite',
      content: `${invitedBy.name} invited you to join ${group.name}`,
      relatedTo: group._id,
      onModel: 'Group'
    });

    return notification;
  }

  // Create friend request notification
  static async createFriendRequestNotification(sender, recipient) {
    const notification = await this.createNotification({
      recipient: recipient,
      sender: sender,
      type: 'friend_request',
      content: `${sender.name} sent you a friend request`,
      relatedTo: sender._id,
      onModel: 'User'
    });

    return notification;
  }

  // Create mention notification
  static async createMentionNotification(message, mentionedUser) {
    const notification = await this.createNotification({
      recipient: mentionedUser,
      sender: message.sender,
      type: 'mention',
      content: `${message.sender.name} mentioned you in a message`,
      relatedTo: message._id,
      onModel: 'Message'
    });

    return notification;
  }

  // Create reaction notification
  static async createReactionNotification(message, reactedBy, reaction) {
    const notification = await this.createNotification({
      recipient: message.sender,
      sender: reactedBy,
      type: 'reaction',
      content: `${reactedBy.name} reacted with ${reaction} to your message`,
      relatedTo: message._id,
      onModel: 'Message'
    });

    return notification;
  }

  // Get user's unread notifications count
  static async getUnreadCount(userId) {
    return Notification.getUnreadCount(userId);
  }

  // Get user's notifications
  static async getUserNotifications(userId, options = {}) {
    return Notification.getUserNotifications(userId, options);
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return notification.markAsRead();
  }

  // Mark all notifications as read
  static async markAllAsRead(userId) {
    return Notification.markAllAsRead(userId);
  }

  // Delete notification
  static async deleteNotification(notificationId, userId) {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return notification;
  }

  // Delete all read notifications
  static async deleteReadNotifications(userId) {
    return Notification.deleteMany({
      recipient: userId,
      read: true
    });
  }

  // Clean up old notifications
  static async cleanupOldNotifications(days = 30) {
    return Notification.deleteOldNotifications(days);
  }
}

module.exports = NotificationService; 