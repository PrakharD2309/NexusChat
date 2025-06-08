const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'away', 'busy'],
    default: 'offline'
  },
  statusMessage: {
    type: String,
    default: ''
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  // New fields for verification and security
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationExpires: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  twoFactorBackupCodes: [String],
  // Session management
  sessions: [{
    token: String,
    device: String,
    ipAddress: String,
    lastActive: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // User blocking and reporting
  blockedUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    blockedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],
  reports: [{
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    details: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved'],
      default: 'pending'
    }
  }],
  // Privacy settings
  privacy: {
    showOnlineStatus: {
      type: Boolean,
      default: true
    },
    showLastSeen: {
      type: Boolean,
      default: true
    },
    showReadReceipts: {
      type: Boolean,
      default: true
    },
    showProfilePicture: {
      type: Boolean,
      default: true
    },
    allowFriendRequests: {
      type: Boolean,
      default: true
    }
  },
  // Notification preferences
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    sound: {
      type: Boolean,
      default: true
    },
    doNotDisturb: {
      enabled: {
        type: Boolean,
        default: false
      },
      schedule: {
        start: String,
        end: String
      }
    }
  },
  // User statistics
  stats: {
    totalMessages: {
      type: Number,
      default: 0
    },
    totalGroups: {
      type: Number,
      default: 0
    },
    lastActive: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      delete ret.verificationToken;
      delete ret.verificationExpires;
      delete ret.twoFactorSecret;
      delete ret.twoFactorBackupCodes;
      delete ret.sessions;
      return ret;
    }
  }
});

// Indexes
userSchema.index({ username: 'text', email: 'text' });
userSchema.index({ status: 1 });
userSchema.index({ 'blockedUsers.user': 1 });
userSchema.index({ 'sessions.token': 1 });

// Password hashing
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = async function() {
  const token = jwt.sign(
    { userId: this._id },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
  
  this.sessions.push({
    token,
    device: 'web',
    ipAddress: '127.0.0.1',
    lastActive: new Date()
  });
  
  await this.save();
  return token;
};

userSchema.methods.removeSession = async function(token) {
  this.sessions = this.sessions.filter(session => session.token !== token);
  return this.save();
};

// New methods for blocking
userSchema.methods.blockUser = async function(userId, reason) {
  if (!this.blockedUsers.some(block => block.user.toString() === userId.toString())) {
    this.blockedUsers.push({
      user: userId,
      reason
    });
    return this.save();
  }
  return this;
};

userSchema.methods.unblockUser = async function(userId) {
  this.blockedUsers = this.blockedUsers.filter(
    block => block.user.toString() !== userId.toString()
  );
  return this.save();
};

userSchema.methods.isBlocked = function(userId) {
  return this.blockedUsers.some(block => block.user.toString() === userId.toString());
};

// New methods for reporting
userSchema.methods.reportUser = async function(reportedBy, reason, details) {
  this.reports.push({
    reportedBy,
    reason,
    details
  });
  return this.save();
};

userSchema.methods.updateReportStatus = async function(reportId, status) {
  const report = this.reports.id(reportId);
  if (report) {
    report.status = status;
    return this.save();
  }
  return this;
};

// New methods for verification
userSchema.methods.generateVerificationToken = async function() {
  const token = Math.random().toString(36).substring(2, 15);
  this.verificationToken = token;
  this.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return this.save();
};

userSchema.methods.verify = async function(token) {
  if (this.verificationToken === token && this.verificationExpires > Date.now()) {
    this.isVerified = true;
    this.verificationToken = undefined;
    this.verificationExpires = undefined;
    return this.save();
  }
  return false;
};

// New methods for two-factor authentication
userSchema.methods.enableTwoFactor = async function(secret, backupCodes) {
  this.twoFactorEnabled = true;
  this.twoFactorSecret = secret;
  this.twoFactorBackupCodes = backupCodes;
  return this.save();
};

userSchema.methods.disableTwoFactor = async function() {
  this.twoFactorEnabled = false;
  this.twoFactorSecret = undefined;
  this.twoFactorBackupCodes = undefined;
  return this.save();
};

// New methods for privacy settings
userSchema.methods.updatePrivacySettings = async function(settings) {
  this.privacy = { ...this.privacy, ...settings };
  return this.save();
};

// New methods for notification preferences
userSchema.methods.updateNotificationPreferences = async function(preferences) {
  this.notifications = { ...this.notifications, ...preferences };
  return this.save();
};

// New methods for status management
userSchema.methods.updateStatus = async function(status, message = '') {
  this.status = status;
  this.statusMessage = message;
  this.lastSeen = new Date();
  return this.save();
};

// New methods for statistics
userSchema.methods.updateStats = async function() {
  this.stats.totalMessages = await mongoose.model('Message').countDocuments({ sender: this._id });
  this.stats.totalGroups = await mongoose.model('Group').countDocuments({ 'members.user': this._id });
  this.stats.lastActive = new Date();
  return this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User; 