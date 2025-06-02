const mongoose = require('mongoose');
const validateEnv = require('./config/validateEnv');

// Validate environment variables at startup
validateEnv();

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'audio', 'video', 'location', 'contact', 'poll'],
    default: 'text'
  },
  content: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String
  },
  fileName: {
    type: String
  },
  fileSize: {
    type: Number
  },
  fileType: {
    type: String
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  forwardedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  edited: {
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date
    },
    originalContent: {
      type: String
    }
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  pinnedAt: Date,
  pinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  thread: {
    parentMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    isThread: {
      type: Boolean,
      default: false
    },
    threadCount: {
      type: Number,
      default: 0
    }
  },
  translation: {
    originalLanguage: String,
    translatedContent: String,
    translatedLanguage: String
  },
  scheduledFor: Date,
  isScheduled: {
    type: Boolean,
    default: false
  },
  expiresAt: Date,
  readReceipts: {
    enabled: {
      type: Boolean,
      default: true
    },
    visibleTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ group: 1, createdAt: -1 });
messageSchema.index({ 'reactions.user': 1 });
messageSchema.index({ isArchived: 1 });
messageSchema.index({ isDeleted: 1 });
messageSchema.index({ isPinned: 1 });
messageSchema.index({ 'thread.parentMessage': 1 });
messageSchema.index({ scheduledFor: 1 });
messageSchema.index({ expiresAt: 1 });

// Methods
messageSchema.methods.addReaction = async function(userId, emoji) {
  const existingReaction = this.reactions.find(r => r.user.toString() === userId.toString());
  if (existingReaction) {
    existingReaction.emoji = emoji;
    existingReaction.createdAt = new Date();
  } else {
    this.reactions.push({ user: userId, emoji });
  }
  return this.save();
};

messageSchema.methods.removeReaction = async function(userId) {
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  return this.save();
};

messageSchema.methods.edit = async function(newContent) {
  if (!this.edited.isEdited) {
    this.edited.originalContent = this.content;
  }
  this.content = newContent;
  this.edited.isEdited = true;
  this.edited.editedAt = new Date();
  return this.save();
};

messageSchema.methods.deleteForUser = async function(userId) {
  if (!this.deletedFor.includes(userId)) {
    this.deletedFor.push(userId);
  }
  if (this.deletedFor.length === 2) {
    this.isDeleted = true;
  }
  return this.save();
};

messageSchema.methods.archive = async function() {
  this.isArchived = true;
  return this.save();
};

messageSchema.methods.unarchive = async function() {
  this.isArchived = false;
  return this.save();
};

messageSchema.methods.pin = async function(userId) {
  this.isPinned = true;
  this.pinnedAt = new Date();
  this.pinnedBy = userId;
  return this.save();
};

messageSchema.methods.unpin = async function() {
  this.isPinned = false;
  this.pinnedAt = null;
  this.pinnedBy = null;
  return this.save();
};

messageSchema.methods.createThread = async function() {
  this.thread.isThread = true;
  return this.save();
};

messageSchema.methods.addToThread = async function(parentMessageId) {
  this.thread.parentMessage = parentMessageId;
  this.thread.isThread = true;
  return this.save();
};

messageSchema.methods.translate = async function(targetLanguage) {
  this.translation.translatedLanguage = targetLanguage;
  return this.save();
};

messageSchema.methods.schedule = async function(scheduledTime) {
  this.scheduledFor = scheduledTime;
  this.isScheduled = true;
  return this.save();
};

messageSchema.methods.unschedule = async function() {
  this.scheduledFor = null;
  this.isScheduled = false;
  return this.save();
};

messageSchema.methods.setExpiry = async function(expiryTime) {
  this.expiresAt = expiryTime;
  return this.save();
};

messageSchema.methods.toggleReadReceipts = async function(enabled) {
  this.readReceipts.enabled = enabled;
  return this.save();
};

messageSchema.methods.addReadReceiptVisibility = async function(userId) {
  if (!this.readReceipts.visibleTo.includes(userId)) {
    this.readReceipts.visibleTo.push(userId);
  }
  return this.save();
};

messageSchema.methods.removeReadReceiptVisibility = async function(userId) {
  this.readReceipts.visibleTo = this.readReceipts.visibleTo.filter(
    id => id.toString() !== userId.toString()
  );
  return this.save();
};

// Virtual for checking if message is a group message
messageSchema.virtual('isGroupMessage').get(function() {
  return !!this.group;
});

module.exports = mongoose.model('Message', messageSchema); 