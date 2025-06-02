const Message = require('../models/Message');
const User = require('../models/User');

class ReactionService {
  async addReaction(messageId, userId, emoji) {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    const existingReaction = message.reactions.find(
      r => r.user.toString() === userId.toString() && r.emoji === emoji
    );

    if (existingReaction) {
      throw new Error('Reaction already exists');
    }

    message.reactions.push({
      user: userId,
      emoji,
      createdAt: new Date()
    });

    await message.save();
    return message;
  }

  async removeReaction(messageId, userId, emoji) {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    message.reactions = message.reactions.filter(
      r => !(r.user.toString() === userId.toString() && r.emoji === emoji)
    );

    await message.save();
    return message;
  }

  async getMessageReactions(messageId) {
    const message = await Message.findById(messageId)
      .populate('reactions.user', 'username profilePicture');

    if (!message) {
      throw new Error('Message not found');
    }

    // Group reactions by emoji
    const groupedReactions = message.reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: []
        };
      }
      acc[reaction.emoji].count++;
      acc[reaction.emoji].users.push({
        id: reaction.user._id,
        username: reaction.user.username,
        profilePicture: reaction.user.profilePicture,
        timestamp: reaction.createdAt
      });
      return acc;
    }, {});

    return Object.values(groupedReactions);
  }

  async getUserReactions(userId) {
    const messages = await Message.find({
      'reactions.user': userId
    })
    .select('content reactions')
    .populate('sender', 'username profilePicture');

    return messages.map(message => ({
      messageId: message._id,
      content: message.content,
      sender: message.sender,
      reactions: message.reactions
        .filter(r => r.user.toString() === userId.toString())
        .map(r => ({
          emoji: r.emoji,
          timestamp: r.createdAt
        }))
    }));
  }

  async getPopularReactions(userId, limit = 10) {
    const userGroups = await this.getUserGroups(userId);
    
    const messages = await Message.find({
      $or: [
        { recipient: userId },
        { sender: userId },
        { group: { $in: userGroups } }
      ],
      'reactions.0': { $exists: true }
    });

    const reactionCounts = messages.reduce((acc, message) => {
      message.reactions.forEach(reaction => {
        if (!acc[reaction.emoji]) {
          acc[reaction.emoji] = 0;
        }
        acc[reaction.emoji]++;
      });
      return acc;
    }, {});

    return Object.entries(reactionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([emoji, count]) => ({ emoji, count }));
  }

  async getReactionStats(userId) {
    const messages = await Message.find({
      'reactions.user': userId
    });

    const stats = {
      totalReactions: messages.reduce(
        (total, message) => total + message.reactions.filter(
          r => r.user.toString() === userId.toString()
        ).length,
        0
      ),
      uniqueEmojis: new Set(
        messages.flatMap(message =>
          message.reactions
            .filter(r => r.user.toString() === userId.toString())
            .map(r => r.emoji)
        )
      ).size,
      reactionsByType: messages.reduce((acc, message) => {
        message.reactions
          .filter(r => r.user.toString() === userId.toString())
          .forEach(r => {
            if (!acc[r.emoji]) {
              acc[r.emoji] = 0;
            }
            acc[r.emoji]++;
          });
        return acc;
      }, {})
    };

    return stats;
  }

  async getUserGroups(userId) {
    const groups = await Group.find({ members: userId }).select('_id');
    return groups.map(group => group._id);
  }
}

module.exports = new ReactionService(); 