const mongoose = require('mongoose');
const crypto = require('crypto');

const fileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  // File preview
  preview: {
    url: String,
    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'document', 'none'],
      default: 'none'
    },
    thumbnail: String,
    duration: Number, // For video/audio
    dimensions: {
      width: Number,
      height: Number
    },
    pages: Number, // For documents
    isGenerated: {
      type: Boolean,
      default: false
    }
  },
  // File compression
  compression: {
    isCompressed: {
      type: Boolean,
      default: false
    },
    originalSize: Number,
    compressionRatio: Number,
    algorithm: String,
    compressedAt: Date
  },
  // File encryption
  encryption: {
    isEncrypted: {
      type: Boolean,
      default: false
    },
    algorithm: String,
    iv: String,
    key: String,
    encryptedAt: Date
  },
  // File versioning
  versions: [{
    version: {
      type: Number,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    size: Number,
    changes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  currentVersion: {
    type: Number,
    default: 1
  },
  // File metadata
  metadata: {
    lastModified: Date,
    created: Date,
    author: String,
    description: String,
    tags: [String],
    custom: mongoose.Schema.Types.Mixed
  },
  // File access control
  access: {
    isPublic: {
      type: Boolean,
      default: false
    },
    allowedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    allowedGroups: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    }],
    password: String,
    expiresAt: Date
  },
  // File statistics
  stats: {
    downloads: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    },
    lastAccessed: Date
  }
}, {
  timestamps: true
});

// Indexes
fileSchema.index({ name: 'text' });
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ message: 1 });
fileSchema.index({ group: 1 });
fileSchema.index({ 'metadata.tags': 1 });
fileSchema.index({ 'access.allowedUsers': 1 });
fileSchema.index({ 'access.allowedGroups': 1 });

// Methods for file preview
fileSchema.methods.generatePreview = async function() {
  // This would integrate with a preview generation service
  // For now, we'll just set a flag
  this.preview.isGenerated = true;
  return this.save();
};

// Methods for file compression
fileSchema.methods.compress = async function(algorithm = 'gzip') {
  if (!this.compression.isCompressed) {
    this.compression = {
      isCompressed: true,
      originalSize: this.size,
      algorithm,
      compressedAt: new Date()
    };
    // This would integrate with a compression service
    // For now, we'll just set the flag
    return this.save();
  }
  return this;
};

// Methods for file encryption
fileSchema.methods.encrypt = async function() {
  if (!this.encryption.isEncrypted) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const key = crypto.randomBytes(32);

    this.encryption = {
      isEncrypted: true,
      algorithm,
      iv: iv.toString('hex'),
      key: key.toString('hex'),
      encryptedAt: new Date()
    };
    // This would integrate with an encryption service
    // For now, we'll just set the flag
    return this.save();
  }
  return this;
};

fileSchema.methods.decrypt = async function() {
  if (this.encryption.isEncrypted) {
    this.encryption.isEncrypted = false;
    // This would integrate with a decryption service
    // For now, we'll just set the flag
    return this.save();
  }
  return this;
};

// Methods for file versioning
fileSchema.methods.createVersion = async function(url, size, changes, userId) {
  const newVersion = this.currentVersion + 1;
  this.versions.push({
    version: newVersion,
    url,
    size,
    changes,
    createdBy: userId
  });
  this.currentVersion = newVersion;
  return this.save();
};

fileSchema.methods.revertToVersion = async function(versionNumber) {
  const version = this.versions.find(v => v.version === versionNumber);
  if (version) {
    this.url = version.url;
    this.size = version.size;
    this.currentVersion = versionNumber;
    return this.save();
  }
  return this;
};

// Methods for access control
fileSchema.methods.addAccess = async function(userId) {
  if (!this.access.allowedUsers.includes(userId)) {
    this.access.allowedUsers.push(userId);
    return this.save();
  }
  return this;
};

fileSchema.methods.removeAccess = async function(userId) {
  this.access.allowedUsers = this.access.allowedUsers.filter(
    id => id.toString() !== userId.toString()
  );
  return this.save();
};

fileSchema.methods.setPassword = async function(password) {
  this.access.password = password;
  return this.save();
};

fileSchema.methods.setExpiry = async function(expiryDate) {
  this.access.expiresAt = expiryDate;
  return this.save();
};

// Methods for statistics
fileSchema.methods.incrementDownloads = async function() {
  this.stats.downloads += 1;
  this.stats.lastAccessed = new Date();
  return this.save();
};

fileSchema.methods.incrementViews = async function() {
  this.stats.views += 1;
  this.stats.lastAccessed = new Date();
  return this.save();
};

// Methods for metadata
fileSchema.methods.updateMetadata = async function(metadata) {
  this.metadata = { ...this.metadata, ...metadata };
  return this.save();
};

fileSchema.methods.addTag = async function(tag) {
  if (!this.metadata.tags.includes(tag)) {
    this.metadata.tags.push(tag);
    return this.save();
  }
  return this;
};

fileSchema.methods.removeTag = async function(tag) {
  this.metadata.tags = this.metadata.tags.filter(t => t !== tag);
  return this.save();
};

module.exports = mongoose.model('File', fileSchema); 