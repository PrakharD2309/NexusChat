const mongoose = require('mongoose');

const searchSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  query: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['message', 'user', 'file', 'group', 'global'],
    required: true
  },
  // Search filters
  filters: {
    dateRange: {
      start: Date,
      end: Date
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    },
    fileType: [String],
    messageType: [String],
    hasAttachment: Boolean,
    isPinned: Boolean,
    isArchived: Boolean,
    isDeleted: Boolean
  },
  // Search results
  results: {
    messages: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    }],
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    files: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    }],
    groups: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    }]
  },
  // Search statistics
  stats: {
    totalResults: {
      type: Number,
      default: 0
    },
    messageCount: {
      type: Number,
      default: 0
    },
    userCount: {
      type: Number,
      default: 0
    },
    fileCount: {
      type: Number,
      default: 0
    },
    groupCount: {
      type: Number,
      default: 0
    },
    executionTime: Number
  },
  // Search history
  history: {
    isSaved: {
      type: Boolean,
      default: false
    },
    savedAt: Date,
    lastAccessed: Date,
    accessCount: {
      type: Number,
      default: 0
    }
  },
  // Search preferences
  preferences: {
    defaultType: {
      type: String,
      enum: ['message', 'user', 'file', 'group', 'global'],
      default: 'global'
    },
    defaultFilters: {
      type: mongoose.Schema.Types.Mixed
    },
    resultLimit: {
      type: Number,
      default: 50
    },
    sortBy: {
      type: String,
      enum: ['relevance', 'date', 'name'],
      default: 'relevance'
    },
    sortOrder: {
      type: String,
      enum: ['asc', 'desc'],
      default: 'desc'
    }
  }
}, {
  timestamps: true
});

// Indexes
searchSchema.index({ user: 1 });
searchSchema.index({ query: 'text' });
searchSchema.index({ type: 1 });
searchSchema.index({ 'filters.dateRange.start': 1, 'filters.dateRange.end': 1 });
searchSchema.index({ 'history.isSaved': 1 });
searchSchema.index({ 'history.lastAccessed': 1 });

// Methods for search management
searchSchema.methods.saveSearch = async function() {
  this.history.isSaved = true;
  this.history.savedAt = new Date();
  return this.save();
};

searchSchema.methods.unsaveSearch = async function() {
  this.history.isSaved = false;
  this.history.savedAt = null;
  return this.save();
};

searchSchema.methods.updateAccess = async function() {
  this.history.lastAccessed = new Date();
  this.history.accessCount += 1;
  return this.save();
};

// Methods for search results
searchSchema.methods.addResult = async function(type, id) {
  if (!this.results[type].includes(id)) {
    this.results[type].push(id);
    this.stats[`${type}Count`] += 1;
    this.stats.totalResults += 1;
    return this.save();
  }
  return this;
};

searchSchema.methods.removeResult = async function(type, id) {
  this.results[type] = this.results[type].filter(
    resultId => resultId.toString() !== id.toString()
  );
  this.stats[`${type}Count`] -= 1;
  this.stats.totalResults -= 1;
  return this.save();
};

searchSchema.methods.clearResults = async function() {
  this.results = {
    messages: [],
    users: [],
    files: [],
    groups: []
  };
  this.stats = {
    totalResults: 0,
    messageCount: 0,
    userCount: 0,
    fileCount: 0,
    groupCount: 0,
    executionTime: 0
  };
  return this.save();
};

// Methods for search preferences
searchSchema.methods.updatePreferences = async function(preferences) {
  this.preferences = { ...this.preferences, ...preferences };
  return this.save();
};

searchSchema.methods.setDefaultFilters = async function(filters) {
  this.preferences.defaultFilters = filters;
  return this.save();
};

// Static methods for search management
searchSchema.statics.findSavedSearches = function(userId) {
  return this.find({
    user: userId,
    'history.isSaved': true
  }).sort({ 'history.lastAccessed': -1 });
};

searchSchema.statics.findRecentSearches = function(userId, limit = 10) {
  return this.find({
    user: userId
  }).sort({ 'history.lastAccessed': -1 }).limit(limit);
};

searchSchema.statics.findPopularSearches = function(userId, limit = 10) {
  return this.find({
    user: userId
  }).sort({ 'history.accessCount': -1 }).limit(limit);
};

// Static methods for search analytics
searchSchema.statics.getSearchStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        avgExecutionTime: { $avg: '$stats.executionTime' },
        totalResults: { $sum: '$stats.totalResults' }
      }
    }
  ]);
  return stats;
};

module.exports = mongoose.model('Search', searchSchema); 