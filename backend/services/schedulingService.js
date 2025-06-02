const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');
const cron = require('node-cron');
const { sendEmail } = require('./emailService');

class SchedulingService {
  constructor() {
    this.scheduledJobs = new Map();
    this.initializeScheduledMessages();
  }

  async initializeScheduledMessages() {
    const scheduledMessages = await Message.find({
      isScheduled: true,
      scheduledFor: { $gt: new Date() }
    });

    scheduledMessages.forEach(message => {
      this.scheduleMessage(message);
    });
  }

  async scheduleMessage(message) {
    const scheduledTime = new Date(message.scheduledFor);
    const now = new Date();
    
    if (scheduledTime <= now) {
      await this.sendScheduledMessage(message);
      return;
    }

    const jobId = message._id.toString();
    const delay = scheduledTime.getTime() - now.getTime();

    const timeoutId = setTimeout(async () => {
      await this.sendScheduledMessage(message);
      this.scheduledJobs.delete(jobId);
    }, delay);

    this.scheduledJobs.set(jobId, timeoutId);
  }

  async sendScheduledMessage(message) {
    message.isScheduled = false;
    message.scheduledFor = null;
    await message.save();

    // Send the message through your normal message sending mechanism
    // This could be through WebSocket, push notification, etc.
    return message;
  }

  async createScheduledMessage(messageData) {
    const message = new Message({
      ...messageData,
      isScheduled: true,
      scheduledFor: messageData.scheduledFor
    });

    await message.save();
    await this.scheduleMessage(message);
    return message;
  }

  async updateScheduledMessage(messageId, updates) {
    const message = await Message.findById(messageId);
    if (!message || !message.isScheduled) {
      throw new Error('Message not found or not scheduled');
    }

    // Cancel existing schedule
    const jobId = message._id.toString();
    if (this.scheduledJobs.has(jobId)) {
      clearTimeout(this.scheduledJobs.get(jobId));
      this.scheduledJobs.delete(jobId);
    }

    // Update message
    Object.assign(message, updates);
    await message.save();

    // Reschedule if still scheduled
    if (message.isScheduled && message.scheduledFor > new Date()) {
      await this.scheduleMessage(message);
    }

    return message;
  }

  async cancelScheduledMessage(messageId) {
    const message = await Message.findById(messageId);
    if (!message || !message.isScheduled) {
      throw new Error('Message not found or not scheduled');
    }

    const jobId = message._id.toString();
    if (this.scheduledJobs.has(jobId)) {
      clearTimeout(this.scheduledJobs.get(jobId));
      this.scheduledJobs.delete(jobId);
    }

    message.isScheduled = false;
    message.scheduledFor = null;
    await message.save();

    return message;
  }

  async getScheduledMessages(userId) {
    return Message.find({
      $or: [
        { sender: userId },
        { recipient: userId },
        { group: { $in: await this.getUserGroups(userId) } }
      ],
      isScheduled: true,
      scheduledFor: { $gt: new Date() }
    })
    .sort({ scheduledFor: 1 })
    .populate('sender', 'username profilePicture')
    .populate('recipient', 'username profilePicture')
    .populate('group', 'name');
  }

  async createRecurringMessage(messageData) {
    const {
      content,
      sender,
      recipient,
      group,
      schedule,
      startDate,
      endDate,
      timezone
    } = messageData;

    const job = cron.schedule(schedule, async () => {
      const now = new Date();
      if (endDate && now > endDate) {
        job.stop();
        return;
      }

      const message = new Message({
        content,
        sender,
        recipient,
        group,
        isScheduled: false
      });

      await message.save();
      // Send the message through your normal message sending mechanism
    }, {
      timezone
    });

    return {
      jobId: job.id,
      schedule,
      startDate,
      endDate,
      timezone
    };
  }

  async getUserGroups(userId) {
    const groups = await Group.find({ members: userId }).select('_id');
    return groups.map(group => group._id);
  }

  async getScheduledMessageStats(userId) {
    const stats = await Message.aggregate([
      {
        $match: {
          sender: userId,
          isScheduled: true
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$scheduledFor' },
            month: { $month: '$scheduledFor' },
            day: { $dayOfMonth: '$scheduledFor' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    return stats;
  }
}

module.exports = new SchedulingService(); 