const Analytics = require('../models/Analytics');
const Message = require('../models/Message');
const Group = require('../models/Group');
const User = require('../models/User');
const os = require('os');

class AnalyticsService {
  constructor() {
    this.periods = ['hourly', 'daily', 'weekly', 'monthly', 'yearly'];
  }

  // Helper methods for time calculations
  getPeriodStartTime(period, date = new Date()) {
    const d = new Date(date);
    switch (period) {
      case 'hourly':
        d.setMinutes(0, 0, 0);
        break;
      case 'daily':
        d.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        break;
      case 'yearly':
        d.setMonth(0, 1);
        d.setHours(0, 0, 0, 0);
        break;
    }
    return d;
  }

  getPeriodEndTime(period, date = new Date()) {
    const d = new Date(date);
    switch (period) {
      case 'hourly':
        d.setMinutes(59, 59, 999);
        break;
      case 'daily':
        d.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        d.setDate(d.getDate() + (6 - d.getDay()));
        d.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        d.setMonth(d.getMonth() + 1, 0);
        d.setHours(23, 59, 59, 999);
        break;
      case 'yearly':
        d.setMonth(11, 31);
        d.setHours(23, 59, 59, 999);
        break;
    }
    return d;
  }

  // Chat analytics methods
  async collectChatAnalytics(period = 'daily') {
    const startTime = this.getPeriodStartTime(period);
    const endTime = this.getPeriodEndTime(period);

    // Get message statistics
    const messageStats = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: startTime, $lte: endTime }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate message types
    const messageTypes = {
      text: 0,
      image: 0,
      file: 0,
      audio: 0,
      video: 0
    };
    messageStats.forEach(stat => {
      messageTypes[stat._id] = stat.count;
    });

    // Get active chats
    const activeChats = await Message.distinct('recipient', {
      createdAt: { $gte: startTime, $lte: endTime }
    });

    // Calculate average response time
    const responseTimes = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: startTime, $lte: endTime },
          type: 'text'
        }
      },
      {
        $sort: { createdAt: 1 }
      },
      {
        $group: {
          _id: '$recipient',
          messages: { $push: { time: '$createdAt' } }
        }
      }
    ]);

    let totalResponseTime = 0;
    let responseCount = 0;
    responseTimes.forEach(chat => {
      for (let i = 1; i < chat.messages.length; i++) {
        const timeDiff = chat.messages[i].time - chat.messages[i - 1].time;
        if (timeDiff < 3600000) { // Only count responses within 1 hour
          totalResponseTime += timeDiff;
          responseCount++;
        }
      }
    });

    const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

    // Get peak hours
    const peakHours = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: startTime, $lte: endTime }
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Create or update analytics record
    const analytics = await Analytics.findOneAndUpdate(
      {
        type: 'chat',
        period,
        startTime,
        endTime
      },
      {
        chat: {
          totalMessages: messageStats.reduce((sum, stat) => sum + stat.count, 0),
          activeChats: activeChats.length,
          messageTypes,
          averageResponseTime,
          peakHours: peakHours.map(hour => ({
            hour: hour._id,
            messageCount: hour.count
          }))
        }
      },
      {
        new: true,
        upsert: true
      }
    );

    return analytics;
  }

  // Group analytics methods
  async collectGroupAnalytics(period = 'daily') {
    const startTime = this.getPeriodStartTime(period);
    const endTime = this.getPeriodEndTime(period);

    // Get group statistics
    const groupStats = await Group.aggregate([
      {
        $match: {
          createdAt: { $gte: startTime, $lte: endTime }
        }
      },
      {
        $group: {
          _id: '$privacy',
          count: { $sum: 1 },
          totalMembers: { $sum: { $size: '$members' } }
        }
      }
    ]);

    // Calculate group types
    const groupTypes = {
      public: 0,
      private: 0
    };
    groupStats.forEach(stat => {
      groupTypes[stat._id] = stat.count;
    });

    // Get active groups
    const activeGroups = await Message.distinct('group', {
      createdAt: { $gte: startTime, $lte: endTime }
    });

    // Get message statistics for groups
    const groupMessageStats = await Message.aggregate([
      {
        $match: {
          group: { $exists: true },
          createdAt: { $gte: startTime, $lte: endTime }
        }
      },
      {
        $group: {
          _id: {
            group: '$group',
            type: '$type'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate message types for groups
    const messageTypes = {
      text: 0,
      image: 0,
      file: 0,
      audio: 0,
      video: 0
    };
    groupMessageStats.forEach(stat => {
      messageTypes[stat._id.type] = (messageTypes[stat._id.type] || 0) + stat.count;
    });

    // Create or update analytics record
    const analytics = await Analytics.findOneAndUpdate(
      {
        type: 'group',
        period,
        startTime,
        endTime
      },
      {
        group: {
          totalGroups: groupStats.reduce((sum, stat) => sum + stat.count, 0),
          activeGroups: activeGroups.length,
          groupTypes,
          memberStats: {
            totalMembers: groupStats.reduce((sum, stat) => sum + stat.totalMembers, 0),
            averageMembersPerGroup: groupStats.reduce((sum, stat) => sum + stat.totalMembers, 0) / 
              groupStats.reduce((sum, stat) => sum + stat.count, 0),
            activeMembers: activeGroups.length
          },
          messageStats: {
            totalMessages: groupMessageStats.reduce((sum, stat) => sum + stat.count, 0),
            averageMessagesPerGroup: groupMessageStats.reduce((sum, stat) => sum + stat.count, 0) / 
              activeGroups.length,
            messageTypes
          }
        }
      },
      {
        new: true,
        upsert: true
      }
    );

    return analytics;
  }

  // User analytics methods
  async collectUserAnalytics(period = 'daily') {
    const startTime = this.getPeriodStartTime(period);
    const endTime = this.getPeriodEndTime(period);

    // Get user statistics
    const userStats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startTime, $lte: endTime }
        }
      },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate user types
    const userTypes = {
      regular: 0,
      premium: 0,
      admin: 0
    };
    userStats.forEach(stat => {
      userTypes[stat._id] = stat.count;
    });

    // Get active users
    const activeUsers = await Message.distinct('sender', {
      createdAt: { $gte: startTime, $lte: endTime }
    });

    // Get user activity statistics
    const userActivity = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: startTime, $lte: endTime }
        }
      },
      {
        $group: {
          _id: '$sender',
          messageCount: { $sum: 1 },
          groupCount: {
            $sum: { $cond: [{ $ifNull: ['$group', false] }, 1, 0] }
          },
          fileCount: {
            $sum: { $cond: [{ $in: ['$type', ['file', 'image', 'audio', 'video']] }, 1, 0] }
          }
        }
      }
    ]);

    // Create or update analytics record
    const analytics = await Analytics.findOneAndUpdate(
      {
        type: 'user',
        period,
        startTime,
        endTime
      },
      {
        user: {
          totalUsers: userStats.reduce((sum, stat) => sum + stat.count, 0),
          activeUsers: activeUsers.length,
          newUsers: userStats.reduce((sum, stat) => sum + stat.count, 0),
          userTypes,
          activityStats: {
            totalMessages: userActivity.reduce((sum, user) => sum + user.messageCount, 0),
            totalGroups: userActivity.reduce((sum, user) => sum + user.groupCount, 0),
            totalFiles: userActivity.reduce((sum, user) => sum + user.fileCount, 0),
            totalCalls: 0 // TODO: Implement call tracking
          },
          userActivity: userActivity.map(user => ({
            user: user._id,
            messageCount: user.messageCount,
            groupCount: user.groupCount,
            fileCount: user.fileCount,
            callCount: 0, // TODO: Implement call tracking
            activeHours: 0 // TODO: Implement active hours tracking
          }))
        }
      },
      {
        new: true,
        upsert: true
      }
    );

    return analytics;
  }

  // System analytics methods
  async collectSystemAnalytics(period = 'daily') {
    const startTime = this.getPeriodStartTime(period);
    const endTime = this.getPeriodEndTime(period);

    // Get system performance metrics
    const performance = {
      cpuUsage: os.loadavg()[0],
      memoryUsage: (os.totalmem() - os.freemem()) / os.totalmem(),
      diskUsage: 0, // TODO: Implement disk usage tracking
      networkUsage: 0 // TODO: Implement network usage tracking
    };

    // Create or update analytics record
    const analytics = await Analytics.findOneAndUpdate(
      {
        type: 'system',
        period,
        startTime,
        endTime
      },
      {
        system: {
          performance,
          responseTime: {
            average: 0, // TODO: Implement response time tracking
            p95: 0,
            p99: 0
          },
          errorRate: {
            total: 0,
            byType: new Map()
          },
          apiStats: {
            totalRequests: 0,
            requestsByEndpoint: new Map(),
            averageResponseTime: 0
          },
          databaseStats: {
            totalQueries: 0,
            averageQueryTime: 0,
            slowQueries: 0
          },
          cacheStats: {
            hitRate: 0,
            missRate: 0,
            evictionRate: 0
          }
        }
      },
      {
        new: true,
        upsert: true
      }
    );

    return analytics;
  }

  // Methods to get analytics data
  async getAnalytics(type, period, startTime, endTime) {
    return Analytics.findByPeriod(type, period, startTime, endTime);
  }

  async getLatestAnalytics(type, period) {
    return Analytics.getLatestAnalytics(type, period);
  }

  async getAggregatedStats(type, startTime, endTime) {
    switch (type) {
      case 'chat':
        return Analytics.aggregateChatStats(startTime, endTime);
      case 'user':
        return Analytics.aggregateUserStats(startTime, endTime);
      default:
        throw new Error(`Unsupported analytics type: ${type}`);
    }
  }
}

module.exports = new AnalyticsService(); 