const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');

class AnalyticsService {
  async getUserMessageStats(userId, timeRange = '7d') {
    const dateRange = this.getDateRange(timeRange);
    
    const stats = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userId },
            { recipient: userId },
            { group: { $in: await this.getUserGroups(userId) } }
          ],
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$type'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          types: {
            $push: {
              type: '$_id.type',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    return stats;
  }

  async getGroupActivityStats(groupId, timeRange = '7d') {
    const dateRange = this.getDateRange(timeRange);
    
    const stats = await Message.aggregate([
      {
        $match: {
          group: groupId,
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            user: '$sender'
          },
          messageCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          users: {
            $push: {
              user: '$_id.user',
              messageCount: '$messageCount'
            }
          },
          totalMessages: { $sum: '$messageCount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    return stats;
  }

  async getPeakActivityHours(userId) {
    const dateRange = this.getDateRange('30d');
    
    const stats = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userId },
            { recipient: userId },
            { group: { $in: await this.getUserGroups(userId) } }
          ],
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }
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
      }
    ]);

    return stats;
  }

  async getMessageTypeDistribution(userId) {
    const dateRange = this.getDateRange('30d');
    
    const stats = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userId },
            { recipient: userId },
            { group: { $in: await this.getUserGroups(userId) } }
          ],
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    return stats;
  }

  async getResponseTimeStats(userId) {
    const dateRange = this.getDateRange('30d');
    
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userId },
            { recipient: userId }
          ],
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $sort: { createdAt: 1 }
      },
      {
        $group: {
          _id: {
            conversation: {
              $cond: [
                { $eq: ['$sender', userId] },
                '$recipient',
                '$sender'
              ]
            }
          },
          messages: { $push: '$$ROOT' }
        }
      }
    ]);

    const responseTimes = conversations.map(conv => {
      const messages = conv.messages;
      let totalResponseTime = 0;
      let responseCount = 0;

      for (let i = 1; i < messages.length; i++) {
        if (messages[i].sender !== messages[i-1].sender) {
          const responseTime = messages[i].createdAt - messages[i-1].createdAt;
          totalResponseTime += responseTime;
          responseCount++;
        }
      }

      return {
        conversation: conv._id.conversation,
        averageResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
        responseCount
      };
    });

    return responseTimes;
  }

  async getActiveHours(userId) {
    const dateRange = this.getDateRange('30d');
    
    const stats = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userId },
            { recipient: userId },
            { group: { $in: await this.getUserGroups(userId) } }
          ],
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' },
            dayOfWeek: { $dayOfWeek: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    return stats;
  }

  getDateRange(timeRange) {
    const end = new Date();
    const start = new Date();

    switch (timeRange) {
      case '24h':
        start.setHours(start.getHours() - 24);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      default:
        start.setDate(start.getDate() - 7);
    }

    return { start, end };
  }

  async getUserGroups(userId) {
    const groups = await Group.find({ members: userId }).select('_id');
    return groups.map(group => group._id);
  }
}

module.exports = new AnalyticsService(); 