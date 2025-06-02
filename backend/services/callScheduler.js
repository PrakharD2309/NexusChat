const Call = require('../models/Call');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendEmail } = require('./emailService');

class CallSchedulerService {
  constructor() {
    this.scheduledCalls = new Map();
  }

  // Schedule a new call
  async scheduleCall(callData) {
    const {
      type,
      initiator,
      participants,
      group,
      scheduledTime,
      duration,
      title,
      description,
      settings
    } = callData;

    // Create the call record
    const call = new Call({
      type,
      initiator,
      participants: participants.map(user => ({
        user,
        status: 'invited'
      })),
      group,
      status: 'scheduled',
      startTime: scheduledTime,
      duration,
      settings: {
        ...settings,
        title,
        description
      }
    });

    await call.save();

    // Schedule notifications
    await this.scheduleNotifications(call);

    // Schedule the call in memory
    this.scheduledCalls.set(call._id.toString(), {
      call,
      timeout: setTimeout(() => this.startCall(call._id), scheduledTime - Date.now())
    });

    return call;
  }

  // Schedule notifications for a call
  async scheduleNotifications(call) {
    const notificationTimes = [
      { time: 24 * 60 * 60 * 1000, type: 'reminder' }, // 24 hours before
      { time: 60 * 60 * 1000, type: 'reminder' }, // 1 hour before
      { time: 15 * 60 * 1000, type: 'reminder' } // 15 minutes before
    ];

    for (const { time, type } of notificationTimes) {
      const notificationTime = call.startTime - time;
      if (notificationTime > Date.now()) {
        setTimeout(async () => {
          await this.sendCallNotification(call, type);
        }, notificationTime - Date.now());
      }
    }
  }

  // Send call notification
  async sendCallNotification(call, type) {
    const initiator = await User.findById(call.initiator);
    const title = type === 'reminder' ? 'Call Reminder' : 'Call Starting Soon';
    const content = type === 'reminder'
      ? `Reminder: You have a call "${call.settings.title}" scheduled in ${this.getTimeUntilCall(call.startTime)}`
      : `Your call "${call.settings.title}" is starting now`;

    // Create in-app notification
    const notification = new Notification({
      recipient: call.initiator,
      type: 'call',
      title,
      content,
      data: {
        callId: call._id,
        type
      }
    });

    await notification.save();

    // Send email notification
    await sendEmail({
      to: initiator.email,
      subject: title,
      text: content
    });

    // Notify other participants
    for (const participant of call.participants) {
      if (participant.user.toString() !== call.initiator.toString()) {
        const participantNotification = new Notification({
          recipient: participant.user,
          type: 'call',
          title,
          content,
          data: {
            callId: call._id,
            type
          }
        });
        await participantNotification.save();
      }
    }
  }

  // Start a scheduled call
  async startCall(callId) {
    const call = await Call.findById(callId);
    if (!call || call.status !== 'scheduled') return;

    call.status = 'active';
    await call.save();

    // Send immediate notification
    await this.sendCallNotification(call, 'start');

    // Schedule call end
    if (call.duration) {
      setTimeout(async () => {
        await this.endCall(callId);
      }, call.duration * 1000);
    }
  }

  // End a call
  async endCall(callId) {
    const call = await Call.findById(callId);
    if (!call || call.status !== 'active') return;

    call.status = 'ended';
    call.endTime = new Date();
    await call.save();

    // Send end notification
    await this.sendCallNotification(call, 'end');
  }

  // Cancel a scheduled call
  async cancelCall(callId) {
    const call = await Call.findById(callId);
    if (!call || call.status !== 'scheduled') return;

    call.status = 'cancelled';
    await call.save();

    // Clear scheduled notifications
    if (this.scheduledCalls.has(callId.toString())) {
      clearTimeout(this.scheduledCalls.get(callId.toString()).timeout);
      this.scheduledCalls.delete(callId.toString());
    }

    // Send cancellation notification
    await this.sendCallNotification(call, 'cancelled');
  }

  // Reschedule a call
  async rescheduleCall(callId, newTime) {
    const call = await Call.findById(callId);
    if (!call || call.status !== 'scheduled') return;

    call.startTime = newTime;
    await call.save();

    // Reschedule notifications
    if (this.scheduledCalls.has(callId.toString())) {
      clearTimeout(this.scheduledCalls.get(callId.toString()).timeout);
    }

    this.scheduledCalls.set(callId.toString(), {
      call,
      timeout: setTimeout(() => this.startCall(callId), newTime - Date.now())
    });

    await this.scheduleNotifications(call);

    // Send reschedule notification
    await this.sendCallNotification(call, 'rescheduled');
  }

  // Get time until call in human-readable format
  getTimeUntilCall(callTime) {
    const now = Date.now();
    const diff = callTime - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  // Get all scheduled calls for a user
  async getUserScheduledCalls(userId) {
    return Call.find({
      'participants.user': userId,
      status: 'scheduled',
      startTime: { $gt: new Date() }
    }).sort({ startTime: 1 });
  }
}

module.exports = new CallSchedulerService(); 