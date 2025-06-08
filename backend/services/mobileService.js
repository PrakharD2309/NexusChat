const User = require('../models/User');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { sendPushNotification } = require('./pushNotificationService');

class MobileService {
  // Register device for push notifications
  async registerDevice(userId, deviceData) {
    const { deviceToken, deviceType, deviceId } = deviceData;
    
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Add or update device
    const deviceIndex = user.devices.findIndex(d => d.deviceId === deviceId);
    if (deviceIndex >= 0) {
      user.devices[deviceIndex] = {
        deviceToken,
        deviceType,
        deviceId,
        lastActive: new Date()
      };
    } else {
      user.devices.push({
        deviceToken,
        deviceType,
        deviceId,
        lastActive: new Date()
      });
    }

    await user.save();
    return user.devices;
  }

  // Unregister device
  async unregisterDevice(userId, deviceId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.devices = user.devices.filter(d => d.deviceId !== deviceId);
    await user.save();
  }

  // Enable offline mode
  async enableOfflineMode(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.settings.offlineMode = true;
    await user.save();

    // Sync offline data
    await this.syncOfflineData(userId);
  }

  // Disable offline mode
  async disableOfflineMode(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.settings.offlineMode = false;
    await user.save();

    // Sync online data
    await this.syncOnlineData(userId);
  }

  // Sync offline data
  async syncOfflineData(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get recent messages
    const messages = await Message.find({
      $or: [
        { sender: userId },
        { recipient: userId }
      ],
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).populate('sender recipient');

    // Get recent notifications
    const notifications = await Notification.find({
      recipient: userId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    return {
      messages,
      notifications,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        settings: user.settings
      }
    };
  }

  // Sync online data
  async syncOnlineData(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get pending messages
    const pendingMessages = await Message.find({
      sender: userId,
      status: 'pending'
    });

    // Get pending notifications
    const pendingNotifications = await Notification.find({
      recipient: userId,
      status: 'pending'
    });

    return {
      pendingMessages,
      pendingNotifications
    };
  }

  // Handle background sync
  async handleBackgroundSync(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Sync messages
    const messages = await Message.find({
      $or: [
        { sender: userId },
        { recipient: userId }
      ],
      status: 'pending'
    });

    // Sync notifications
    const notifications = await Notification.find({
      recipient: userId,
      status: 'pending'
    });

    // Process pending items
    for (const message of messages) {
      await this.processPendingMessage(message);
    }

    for (const notification of notifications) {
      await this.processPendingNotification(notification);
    }

    return {
      syncedMessages: messages.length,
      syncedNotifications: notifications.length
    };
  }

  // Process pending message
  async processPendingMessage(message) {
    try {
      // Update message status
      message.status = 'sent';
      await message.save();

      // Send push notification
      const recipient = await User.findById(message.recipient);
      if (recipient) {
        for (const device of recipient.devices) {
          await sendPushNotification({
            deviceToken: device.deviceToken,
            title: 'New Message',
            body: message.content,
            data: {
              type: 'message',
              messageId: message._id
            }
          });
        }
      }
    } catch (error) {
      console.error('Error processing pending message:', error);
    }
  }

  // Process pending notification
  async processPendingNotification(notification) {
    try {
      // Update notification status
      notification.status = 'sent';
      await notification.save();

      // Send push notification
      const recipient = await User.findById(notification.recipient);
      if (recipient) {
        for (const device of recipient.devices) {
          await sendPushNotification({
            deviceToken: device.deviceToken,
            title: notification.title,
            body: notification.content,
            data: {
              type: 'notification',
              notificationId: notification._id
            }
          });
        }
      }
    } catch (error) {
      console.error('Error processing pending notification:', error);
    }
  }

  // Get mobile-specific UI settings
  async getMobileUISettings(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      theme: user.settings.mobileTheme || 'light',
      fontSize: user.settings.mobileFontSize || 'medium',
      compactMode: user.settings.mobileCompactMode || false,
      gestures: user.settings.mobileGestures || this.getDefaultGestures(),
      animations: user.settings.mobileAnimations || true
    };
  }

  // Get default mobile gestures
  getDefaultGestures() {
    return {
      swipeLeft: 'archive',
      swipeRight: 'reply',
      doubleTap: 'react',
      longPress: 'menu',
      pullToRefresh: true
    };
  }

  // Update mobile UI settings
  async updateMobileUISettings(userId, settings) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.settings = {
      ...user.settings,
      ...settings
    };

    await user.save();
    return user.settings;
  }

  // Handle mobile app state
  async handleAppState(userId, state) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.settings.mobileAppState = state;
    await user.save();

    // Handle different states
    switch (state) {
      case 'active':
        await this.handleAppActive(userId);
        break;
      case 'background':
        await this.handleAppBackground(userId);
        break;
      case 'inactive':
        await this.handleAppInactive(userId);
        break;
    }
  }

  // Handle app active state
  async handleAppActive(userId) {
    // Sync data
    await this.syncOnlineData(userId);
    
    // Update user status
    await User.findByIdAndUpdate(userId, {
      'status.online': true,
      'status.lastActive': new Date()
    });
  }

  // Handle app background state
  async handleAppBackground(userId) {
    // Start background sync
    await this.handleBackgroundSync(userId);
    
    // Update user status
    await User.findByIdAndUpdate(userId, {
      'status.online': false,
      'status.lastActive': new Date()
    });
  }

  // Handle app inactive state
  async handleAppInactive(userId) {
    // Save offline data
    await this.syncOfflineData(userId);
    
    // Update user status
    await User.findByIdAndUpdate(userId, {
      'status.online': false,
      'status.lastActive': new Date()
    });
  }
}

// Export an instance of the service
module.exports = new MobileService(); 