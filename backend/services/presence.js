const User = require('../models/User');

class PresenceService {
  constructor() {
    this.onlineUsers = new Map();
  }

  async userConnected(userId, socketId) {
    this.onlineUsers.set(userId, {
      socketId,
      lastSeen: new Date(),
      status: 'online'
    });

    await User.findByIdAndUpdate(userId, {
      status: 'online',
      lastSeen: new Date()
    });

    return this.getOnlineUsers();
  }

  async userDisconnected(userId) {
    this.onlineUsers.delete(userId);

    await User.findByIdAndUpdate(userId, {
      status: 'offline',
      lastSeen: new Date()
    });

    return this.getOnlineUsers();
  }

  async updateUserStatus(userId, status) {
    const user = this.onlineUsers.get(userId);
    if (user) {
      user.status = status;
      user.lastSeen = new Date();
      this.onlineUsers.set(userId, user);

      await User.findByIdAndUpdate(userId, {
        status,
        lastSeen: new Date()
      });
    }
  }

  async updateLastSeen(userId) {
    const user = this.onlineUsers.get(userId);
    if (user) {
      user.lastSeen = new Date();
      this.onlineUsers.set(userId, user);

      await User.findByIdAndUpdate(userId, {
        lastSeen: new Date()
      });
    }
  }

  getOnlineUsers() {
    return Array.from(this.onlineUsers.entries()).map(([userId, data]) => ({
      userId,
      ...data
    }));
  }

  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }

  getUserSocketId(userId) {
    return this.onlineUsers.get(userId)?.socketId;
  }
}

module.exports = new PresenceService(); 