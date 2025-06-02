const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');
const crypto = require('crypto');

class ForwardService {
  async forwardMessage(messageId, userId, recipients) {
    const originalMessage = await Message.findById(messageId)
      .populate('sender', 'username profilePicture')
      .populate('attachments');

    if (!originalMessage) {
      throw new Error('Message not found');
    }

    const forwardedMessages = [];
    for (const recipient of recipients) {
      const forwardedMessage = new Message({
        type: 'forwarded',
        content: originalMessage.content,
        sender: userId,
        recipient: recipient.id,
        group: recipient.type === 'group' ? recipient.id : null,
        attachments: originalMessage.attachments,
        forwardedFrom: {
          message: originalMessage._id,
          sender: originalMessage.sender,
          timestamp: originalMessage.createdAt
        }
      });

      await forwardedMessage.save();
      forwardedMessages.push(forwardedMessage);
    }

    return forwardedMessages;
  }

  async createShareableLink(messageId, userId, options = {}) {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = options.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days

    message.shareableLinks = message.shareableLinks || [];
    message.shareableLinks.push({
      token,
      createdBy: userId,
      createdAt: new Date(),
      expiresAt,
      accessCount: 0,
      maxAccess: options.maxAccess || null
    });

    await message.save();
    return {
      token,
      expiresAt,
      url: `${process.env.FRONTEND_URL}/shared/${token}`
    };
  }

  async accessSharedMessage(token) {
    const message = await Message.findOne({
      'shareableLinks.token': token,
      'shareableLinks.expiresAt': { $gt: new Date() }
    })
    .populate('sender', 'username profilePicture')
    .populate('attachments');

    if (!message) {
      throw new Error('Shared message not found or expired');
    }

    const link = message.shareableLinks.find(l => l.token === token);
    if (link.maxAccess && link.accessCount >= link.maxAccess) {
      throw new Error('Maximum access limit reached');
    }

    link.accessCount++;
    await message.save();

    return {
      message: {
        content: message.content,
        sender: message.sender,
        createdAt: message.createdAt,
        attachments: message.attachments
      },
      accessCount: link.accessCount,
      remainingAccess: link.maxAccess ? link.maxAccess - link.accessCount : null
    };
  }

  async revokeShareableLink(messageId, userId, token) {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    const linkIndex = message.shareableLinks.findIndex(
      l => l.token === token && l.createdBy.toString() === userId.toString()
    );

    if (linkIndex === -1) {
      throw new Error('Shareable link not found');
    }

    message.shareableLinks.splice(linkIndex, 1);
    await message.save();
    return { revoked: true };
  }

  async getForwardHistory(messageId) {
    const message = await Message.findById(messageId)
      .populate('forwardedFrom.message')
      .populate('forwardedFrom.sender', 'username profilePicture');

    if (!message) {
      throw new Error('Message not found');
    }

    const history = [];
    let currentMessage = message;

    while (currentMessage.forwardedFrom) {
      history.push({
        message: currentMessage.forwardedFrom.message,
        sender: currentMessage.forwardedFrom.sender,
        timestamp: currentMessage.forwardedFrom.timestamp
      });
      currentMessage = currentMessage.forwardedFrom.message;
    }

    return history;
  }

  async getSharedLinks(userId) {
    const messages = await Message.find({
      'shareableLinks.createdBy': userId
    })
    .select('content shareableLinks')
    .populate('sender', 'username profilePicture');

    return messages.map(message => ({
      messageId: message._id,
      content: message.content,
      sender: message.sender,
      links: message.shareableLinks.map(link => ({
        token: link.token,
        createdAt: link.createdAt,
        expiresAt: link.expiresAt,
        accessCount: link.accessCount,
        maxAccess: link.maxAccess,
        url: `${process.env.FRONTEND_URL}/shared/${link.token}`
      }))
    }));
  }
}

module.exports = new ForwardService(); 