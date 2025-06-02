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
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['member', 'moderator', 'admin', 'custom'],
      default: 'member'
    },
    customRole: {
      name: String,
      permissions: [String]
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    privacy: {
      type: String,
      enum: ['public', 'private'],
      default: 'private'
    },
    allowInvites: {
      type: Boolean,
      default: true
    },
    allowMessageEditing: {
      type: Boolean,
      default: true
    },
    allowMessageDeletion: {
      type: Boolean,
      default: true
    },
    allowFileSharing: {
      type: Boolean,
      default: true
    },
    maxFileSize: {
      type: Number,
      default: 10 * 1024 * 1024 // 10MB
    },
    allowedFileTypes: {
      type: [String],
      default: ['image', 'document', 'audio', 'video']
    }
  },
  // New fields for announcements and invite links
  announcements: [{
    content: {
      type: String,
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    },
    expiresAt: Date
  }],
  inviteLinks: [{
    code: {
      type: String,
      required: true,
      unique: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date,
    maxUses: Number,
    usedCount: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  // Group roles configuration
  roles: [{
    name: {
      type: String,
      required: true
    },
    permissions: [{
      type: String,
      enum: [
        'manage_messages',
        'manage_members',
        'manage_roles',
        'manage_announcements',
        'manage_invites',
        'pin_messages',
        'delete_messages',
        'edit_messages',
        'mute_members',
        'ban_members'
      ]
    }],
    color: String,
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  // Group statistics
  stats: {
    totalMessages: {
      type: Number,
      default: 0
    },
    activeMembers: {
      type: Number,
      default: 0
    },
    lastActivity: Date
  }
}, {
  timestamps: true
});

// Indexes
groupSchema.index({ name: 'text', description: 'text' });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ 'inviteLinks.code': 1 });

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

// New methods for announcements
groupSchema.methods.addAnnouncement = async function(content, userId, expiresAt = null) {
  this.announcements.push({
    content,
    createdBy: userId,
    expiresAt
  });
  return this.save();
};

groupSchema.methods.removeAnnouncement = async function(announcementId) {
  this.announcements = this.announcements.filter(a => a._id.toString() !== announcementId.toString());
  return this.save();
};

// New methods for invite links
groupSchema.methods.createInviteLink = async function(userId, options = {}) {
  const code = Math.random().toString(36).substring(2, 15);
  this.inviteLinks.push({
    code,
    createdBy: userId,
    expiresAt: options.expiresAt,
    maxUses: options.maxUses,
    isActive: true
  });
  return this.save();
};

groupSchema.methods.deactivateInviteLink = async function(code) {
  const inviteLink = this.inviteLinks.find(link => link.code === code);
  if (inviteLink) {
    inviteLink.isActive = false;
    return this.save();
  }
  return this;
};

// New methods for roles
groupSchema.methods.createRole = async function(name, permissions, color) {
  this.roles.push({
    name,
    permissions,
    color
  });
  return this.save();
};

groupSchema.methods.updateRole = async function(roleId, updates) {
  const role = this.roles.id(roleId);
  if (role) {
    Object.assign(role, updates);
    return this.save();
  }
  return this;
};

groupSchema.methods.deleteRole = async function(roleId) {
  this.roles = this.roles.filter(role => role._id.toString() !== roleId.toString());
  return this.save();
};

groupSchema.methods.assignRole = async function(userId, roleName) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (member) {
    member.role = roleName;
    return this.save();
  }
  return this;
};

// New methods for statistics
groupSchema.methods.updateStats = async function() {
  this.stats.totalMessages = await mongoose.model('Message').countDocuments({ group: this._id });
  this.stats.activeMembers = this.members.length;
  this.stats.lastActivity = new Date();
  return this.save();
};

module.exports = mongoose.model('Group', groupSchema); 