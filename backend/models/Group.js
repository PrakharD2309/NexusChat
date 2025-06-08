const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  avatar: {
    type: String
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    isPrivate: {
      type: Boolean,
      default: false
    },
    allowInvites: {
      type: Boolean,
      default: true
    },
    allowFileSharing: {
      type: Boolean,
      default: true
    }
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
groupSchema.index({ name: 'text' });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ lastActivity: -1 });

// Methods for member management
groupSchema.methods.isAdmin = function(userId) {
  return this.admins.includes(userId);
};

groupSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.user.toString() === userId.toString());
};

groupSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

groupSchema.methods.addMember = async function(userId, role = 'member') {
  if (!this.isMember(userId)) {
    this.members.push({
      user: userId,
      role: role
    });
    return this.save();
  }
  return this;
};

groupSchema.methods.removeMember = async function(userId) {
  this.members = this.members.filter(member => member.user.toString() !== userId.toString());
  this.admins = this.admins.filter(admin => admin.toString() !== userId.toString());
  return this.save();
};

groupSchema.methods.promoteToAdmin = async function(userId) {
  if (!this.isAdmin(userId)) {
    this.admins.push(userId);
    const member = this.members.find(m => m.user.toString() === userId.toString());
    if (member) {
      member.role = 'admin';
    }
    return this.save();
  }
  return this;
};

groupSchema.methods.demoteFromAdmin = async function(userId) {
  this.admins = this.admins.filter(admin => admin.toString() !== userId.toString());
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (member) {
    member.role = 'member';
  }
  return this.save();
};

// New methods for statistics
groupSchema.methods.updateStats = async function() {
  this.stats.totalMessages = await mongoose.model('Message').countDocuments({ group: this._id });
  this.stats.activeMembers = this.members.length;
  this.stats.lastActivity = new Date();
  return this.save();
};

module.exports = mongoose.model('Group', groupSchema); 