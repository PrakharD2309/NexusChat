const mongoose = require('mongoose');

const callHistorySchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number // in seconds
  },
  status: {
    type: String,
    enum: ['missed', 'completed', 'rejected'],
    required: true
  },
  type: {
    type: String,
    enum: ['audio', 'video'],
    required: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries
callHistorySchema.index({ caller: 1, recipient: 1, startTime: -1 });
callHistorySchema.index({ status: 1 });

const CallHistory = mongoose.model('CallHistory', callHistorySchema);

module.exports = CallHistory; 