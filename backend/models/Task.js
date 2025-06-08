const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['backup', 'restore', 'sync'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  data: {
    source: String,
    destination: String,
    files: [{
      name: String,
      size: Number,
      type: String,
      path: String
    }],
    options: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  },
  progress: {
    type: Number,
    default: 0
  },
  error: {
    message: String,
    code: String,
    details: mongoose.Schema.Types.Mixed
  },
  startedAt: Date,
  completedAt: Date,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
taskSchema.index({ user: 1, type: 1, status: 1 });
taskSchema.index({ status: 1, createdAt: 1 });

// Methods
taskSchema.methods.updateProgress = async function(progress) {
  this.progress = progress;
  if (progress === 100) {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  return this.save();
};

taskSchema.methods.fail = async function(error) {
  this.status = 'failed';
  this.error = error;
  this.completedAt = new Date();
  return this.save();
};

taskSchema.methods.start = async function() {
  this.status = 'in_progress';
  this.startedAt = new Date();
  return this.save();
};

const Task = mongoose.model('Task', taskSchema);

module.exports = Task; 