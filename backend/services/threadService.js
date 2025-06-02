const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');

class ThreadService {
  async createThread(parentMessageId, replyData) {
    const parentMessage = await Message.findById(parentMessageId);
    if (!parentMessage) {
      throw new Error('Parent message not found');
    }

    const reply = new Message({
      ...replyData,
      type: 'reply',
      parentMessage: parentMessageId,
      threadId: parentMessage.threadId || parentMessageId
    });

    await reply.save();

    // Update parent message's thread count
    parentMessage.threadCount = (parentMessage.threadCount || 0) + 1;
    await parentMessage.save();

    return reply;
  }

  async getThreadReplies(threadId, userId) {
    const messages = await Message.find({
      threadId,
      $or: [
        { type: 'reply' },
        { _id: threadId }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'username profilePicture')
    .populate('recipient', 'username profilePicture');

    return messages;
  }

  async getThreadParticipants(threadId) {
    const messages = await Message.find({ threadId })
      .populate('sender', 'username profilePicture')
      .populate('recipient', 'username profilePicture');

    const participants = new Set();
    messages.forEach(message => {
      if (message.sender) participants.add(message.sender._id.toString());
      if (message.recipient) participants.add(message.recipient._id.toString());
    });

    return Array.from(participants).map(id => {
      const message = messages.find(m => 
        m.sender?._id.toString() === id || m.recipient?._id.toString() === id
      );
      return message.sender?._id.toString() === id ? message.sender : message.recipient;
    });
  }

  async getThreadStats(threadId) {
    const messages = await Message.find({ threadId });
    const participants = await this.getThreadParticipants(threadId);

    return {
      totalReplies: messages.length - 1, // Exclude parent message
      participantCount: participants.length,
      lastReplyAt: messages.length > 1 ? messages[messages.length - 1].createdAt : null,
      averageReplyTime: this.calculateAverageReplyTime(messages)
    };
  }

  async getUserThreads(userId) {
    const threads = await Message.find({
      $or: [
        { sender: userId, threadId: { $exists: true } },
        { recipient: userId, threadId: { $exists: true } }
      ]
    })
    .sort({ updatedAt: -1 })
    .populate('sender', 'username profilePicture')
    .populate('recipient', 'username profilePicture');

    return threads;
  }

  async markThreadAsRead(threadId, userId) {
    const messages = await Message.find({
      threadId,
      recipient: userId,
      read: false
    });

    for (const message of messages) {
      message.read = true;
      message.readAt = new Date();
      await message.save();
    }

    return messages.length;
  }

  calculateAverageReplyTime(messages) {
    if (messages.length <= 1) return null;

    const replyTimes = [];
    for (let i = 1; i < messages.length; i++) {
      const timeDiff = messages[i].createdAt - messages[i - 1].createdAt;
      replyTimes.push(timeDiff);
    }

    const averageTime = replyTimes.reduce((a, b) => a + b, 0) / replyTimes.length;
    return averageTime;
  }
}

module.exports = new ThreadService(); 