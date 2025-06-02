const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['audio', 'video'],
    required: true
  },
  initiator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: Date,
    status: {
      type: String,
      enum: ['invited', 'joined', 'left', 'declined'],
      default: 'invited'
    },
    // Call quality metrics
    quality: {
      audio: {
        bitrate: Number,
        packetLoss: Number,
        latency: Number,
        jitter: Number
      },
      video: {
        bitrate: Number,
        packetLoss: Number,
        latency: Number,
        jitter: Number,
        resolution: String,
        fps: Number
      }
    }
  }],
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'ended', 'missed'],
    default: 'pending'
  },
  startTime: Date,
  endTime: Date,
  duration: Number,
  // Screen sharing
  screenShare: {
    isActive: {
      type: Boolean,
      default: false
    },
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    startTime: Date,
    endTime: Date
  },
  // Call recording
  recording: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    startTime: Date,
    endTime: Date,
    fileUrl: String,
    fileSize: Number,
    duration: Number
  },
  // Call quality monitoring
  qualityMetrics: {
    averageAudioBitrate: Number,
    averageVideoBitrate: Number,
    averageLatency: Number,
    averagePacketLoss: Number,
    averageJitter: Number,
    qualityScore: Number,
    issues: [{
      type: {
        type: String,
        enum: ['audio', 'video', 'connection'],
        required: true
      },
      description: String,
      timestamp: Date,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'low'
      }
    }]
  },
  // Call settings
  settings: {
    maxParticipants: {
      type: Number,
      default: 10
    },
    allowScreenShare: {
      type: Boolean,
      default: true
    },
    allowRecording: {
      type: Boolean,
      default: true
    },
    videoEnabled: {
      type: Boolean,
      default: true
    },
    audioEnabled: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Indexes
callSchema.index({ initiator: 1 });
callSchema.index({ 'participants.user': 1 });
callSchema.index({ group: 1 });
callSchema.index({ status: 1 });
callSchema.index({ startTime: 1 });

// Methods for participant management
callSchema.methods.addParticipant = async function(userId) {
  if (!this.participants.some(p => p.user.toString() === userId.toString())) {
    this.participants.push({
      user: userId,
      status: 'invited'
    });
    return this.save();
  }
  return this;
};

callSchema.methods.removeParticipant = async function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.status = 'left';
    participant.leftAt = new Date();
    return this.save();
  }
  return this;
};

callSchema.methods.updateParticipantStatus = async function(userId, status) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.status = status;
    if (status === 'joined') {
      participant.joinedAt = new Date();
    } else if (status === 'left') {
      participant.leftAt = new Date();
    }
    return this.save();
  }
  return this;
};

// Methods for screen sharing
callSchema.methods.startScreenShare = async function(userId) {
  if (!this.screenShare.isActive) {
    this.screenShare = {
      isActive: true,
      sharedBy: userId,
      startTime: new Date()
    };
    return this.save();
  }
  return this;
};

callSchema.methods.stopScreenShare = async function() {
  if (this.screenShare.isActive) {
    this.screenShare.isActive = false;
    this.screenShare.endTime = new Date();
    return this.save();
  }
  return this;
};

// Methods for call recording
callSchema.methods.startRecording = async function(userId) {
  if (!this.recording.isEnabled) {
    this.recording = {
      isEnabled: true,
      startedBy: userId,
      startTime: new Date()
    };
    return this.save();
  }
  return this;
};

callSchema.methods.stopRecording = async function(fileUrl, fileSize) {
  if (this.recording.isEnabled) {
    this.recording.isEnabled = false;
    this.recording.endTime = new Date();
    this.recording.fileUrl = fileUrl;
    this.recording.fileSize = fileSize;
    this.recording.duration = (this.recording.endTime - this.recording.startTime) / 1000;
    return this.save();
  }
  return this;
};

// Methods for quality monitoring
callSchema.methods.updateParticipantQuality = async function(userId, quality) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.quality = quality;
    return this.save();
  }
  return this;
};

callSchema.methods.addQualityIssue = async function(issue) {
  this.qualityMetrics.issues.push({
    ...issue,
    timestamp: new Date()
  });
  return this.save();
};

callSchema.methods.updateQualityMetrics = async function() {
  const participants = this.participants.filter(p => p.status === 'joined');
  if (participants.length > 0) {
    const metrics = {
      averageAudioBitrate: 0,
      averageVideoBitrate: 0,
      averageLatency: 0,
      averagePacketLoss: 0,
      averageJitter: 0
    };

    participants.forEach(p => {
      if (p.quality) {
        if (p.quality.audio) {
          metrics.averageAudioBitrate += p.quality.audio.bitrate || 0;
          metrics.averageLatency += p.quality.audio.latency || 0;
          metrics.averagePacketLoss += p.quality.audio.packetLoss || 0;
          metrics.averageJitter += p.quality.audio.jitter || 0;
        }
        if (p.quality.video) {
          metrics.averageVideoBitrate += p.quality.video.bitrate || 0;
        }
      }
    });

    const count = participants.length;
    metrics.averageAudioBitrate /= count;
    metrics.averageVideoBitrate /= count;
    metrics.averageLatency /= count;
    metrics.averagePacketLoss /= count;
    metrics.averageJitter /= count;

    // Calculate quality score (0-100)
    const score = Math.max(0, Math.min(100,
      100 - (metrics.averagePacketLoss * 10) - (metrics.averageLatency / 10) - (metrics.averageJitter * 5)
    ));

    this.qualityMetrics = {
      ...metrics,
      qualityScore: score
    };

    return this.save();
  }
  return this;
};

// Methods for call management
callSchema.methods.startCall = async function() {
  this.status = 'active';
  this.startTime = new Date();
  return this.save();
};

callSchema.methods.endCall = async function() {
  this.status = 'ended';
  this.endTime = new Date();
  this.duration = (this.endTime - this.startTime) / 1000;
  return this.save();
};

module.exports = mongoose.model('Call', callSchema); 