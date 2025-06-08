const mongoose = require('mongoose');

const callHistorySchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['video', 'audio'],
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['completed', 'missed', 'rejected'],
    default: 'completed'
  }
}, {
  timestamps: true
});

// Indexes for faster queries
callHistorySchema.index({ roomId: 1 });
callHistorySchema.index({ status: 1 });

const CallHistory = mongoose.model('CallHistory', callHistorySchema);

module.exports = CallHistory; 