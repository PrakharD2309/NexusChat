const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['chat', 'group', 'user', 'system'],
    required: true
  },
  period: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly'],
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  // Chat analytics
  chat: {
    totalMessages: {
      type: Number,
      default: 0
    },
    activeChats: {
      type: Number,
      default: 0
    },
    messageTypes: {
      text: { type: Number, default: 0 },
      image: { type: Number, default: 0 },
      file: { type: Number, default: 0 },
      audio: { type: Number, default: 0 },
      video: { type: Number, default: 0 }
    },
    averageResponseTime: Number,
    peakHours: [{
      hour: Number,
      messageCount: Number
    }],
    userEngagement: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      messageCount: Number,
      responseTime: Number,
      activeHours: Number
    }]
  },
  // Group analytics
  group: {
    totalGroups: {
      type: Number,
      default: 0
    },
    activeGroups: {
      type: Number,
      default: 0
    },
    groupTypes: {
      public: { type: Number, default: 0 },
      private: { type: Number, default: 0 }
    },
    memberStats: {
      totalMembers: { type: Number, default: 0 },
      averageMembersPerGroup: Number,
      activeMembers: { type: Number, default: 0 }
    },
    messageStats: {
      totalMessages: { type: Number, default: 0 },
      averageMessagesPerGroup: Number,
      messageTypes: {
        text: { type: Number, default: 0 },
        image: { type: Number, default: 0 },
        file: { type: Number, default: 0 },
        audio: { type: Number, default: 0 },
        video: { type: Number, default: 0 }
      }
    },
    groupActivity: [{
      group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
      },
      messageCount: Number,
      memberCount: Number,
      activeHours: Number
    }]
  },
  // User analytics
  user: {
    totalUsers: {
      type: Number,
      default: 0
    },
    activeUsers: {
      type: Number,
      default: 0
    },
    newUsers: {
      type: Number,
      default: 0
    },
    userTypes: {
      regular: { type: Number, default: 0 },
      premium: { type: Number, default: 0 },
      admin: { type: Number, default: 0 }
    },
    activityStats: {
      totalMessages: { type: Number, default: 0 },
      totalGroups: { type: Number, default: 0 },
      totalFiles: { type: Number, default: 0 },
      totalCalls: { type: Number, default: 0 }
    },
    userActivity: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      messageCount: Number,
      groupCount: Number,
      fileCount: Number,
      callCount: Number,
      activeHours: Number
    }]
  },
  // System analytics
  system: {
    performance: {
      cpuUsage: Number,
      memoryUsage: Number,
      diskUsage: Number,
      networkUsage: Number
    },
    responseTime: {
      average: Number,
      p95: Number,
      p99: Number
    },
    errorRate: {
      total: { type: Number, default: 0 },
      byType: {
        type: Map,
        of: Number
      }
    },
    apiStats: {
      totalRequests: { type: Number, default: 0 },
      requestsByEndpoint: {
        type: Map,
        of: Number
      },
      averageResponseTime: Number
    },
    databaseStats: {
      totalQueries: { type: Number, default: 0 },
      averageQueryTime: Number,
      slowQueries: { type: Number, default: 0 }
    },
    cacheStats: {
      hitRate: Number,
      missRate: Number,
      evictionRate: Number
    }
  }
}, {
  timestamps: true
});

// Indexes
analyticsSchema.index({ type: 1, period: 1 });
analyticsSchema.index({ startTime: 1, endTime: 1 });

// Methods for chat analytics
analyticsSchema.methods.updateChatStats = async function(stats) {
  this.chat = { ...this.chat, ...stats };
  return this.save();
};

analyticsSchema.methods.addUserEngagement = async function(userId, engagement) {
  const existingEngagement = this.chat.userEngagement.find(
    e => e.user.toString() === userId.toString()
  );
  if (existingEngagement) {
    Object.assign(existingEngagement, engagement);
  } else {
    this.chat.userEngagement.push({
      user: userId,
      ...engagement
    });
  }
  return this.save();
};

// Methods for group analytics
analyticsSchema.methods.updateGroupStats = async function(stats) {
  this.group = { ...this.group, ...stats };
  return this.save();
};

analyticsSchema.methods.addGroupActivity = async function(groupId, activity) {
  const existingActivity = this.group.groupActivity.find(
    a => a.group.toString() === groupId.toString()
  );
  if (existingActivity) {
    Object.assign(existingActivity, activity);
  } else {
    this.group.groupActivity.push({
      group: groupId,
      ...activity
    });
  }
  return this.save();
};

// Methods for user analytics
analyticsSchema.methods.updateUserStats = async function(stats) {
  this.user = { ...this.user, ...stats };
  return this.save();
};

analyticsSchema.methods.addUserActivity = async function(userId, activity) {
  const existingActivity = this.user.userActivity.find(
    a => a.user.toString() === userId.toString()
  );
  if (existingActivity) {
    Object.assign(existingActivity, activity);
  } else {
    this.user.userActivity.push({
      user: userId,
      ...activity
    });
  }
  return this.save();
};

// Methods for system analytics
analyticsSchema.methods.updateSystemStats = async function(stats) {
  this.system = { ...this.system, ...stats };
  return this.save();
};

analyticsSchema.methods.addError = async function(errorType) {
  this.system.errorRate.total += 1;
  const currentCount = this.system.errorRate.byType.get(errorType) || 0;
  this.system.errorRate.byType.set(errorType, currentCount + 1);
  return this.save();
};

// Static methods for analytics management
analyticsSchema.statics.findByPeriod = function(type, period, startTime, endTime) {
  return this.find({
    type,
    period,
    startTime: { $gte: startTime },
    endTime: { $lte: endTime }
  }).sort({ startTime: 1 });
};

analyticsSchema.statics.getLatestAnalytics = function(type, period) {
  return this.findOne({
    type,
    period
  }).sort({ endTime: -1 });
};

// Static methods for analytics aggregation
analyticsSchema.statics.aggregateChatStats = async function(startTime, endTime) {
  return this.aggregate([
    {
      $match: {
        type: 'chat',
        startTime: { $gte: startTime },
        endTime: { $lte: endTime }
      }
    },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: '$chat.totalMessages' },
        activeChats: { $avg: '$chat.activeChats' },
        averageResponseTime: { $avg: '$chat.averageResponseTime' }
      }
    }
  ]);
};

analyticsSchema.statics.aggregateUserStats = async function(startTime, endTime) {
  return this.aggregate([
    {
      $match: {
        type: 'user',
        startTime: { $gte: startTime },
        endTime: { $lte: endTime }
      }
    },
    {
      $group: {
        _id: null,
        totalUsers: { $max: '$user.totalUsers' },
        activeUsers: { $avg: '$user.activeUsers' },
        newUsers: { $sum: '$user.newUsers' }
      }
    }
  ]);
};

module.exports = mongoose.model('Analytics', analyticsSchema); 