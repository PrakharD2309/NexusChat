const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');

class PollService {
  async createPoll(pollData) {
    const {
      question,
      options,
      creator,
      group,
      isAnonymous,
      allowMultipleVotes,
      endDate,
      showResults
    } = pollData;

    const message = new Message({
      type: 'poll',
      content: question,
      sender: creator,
      group,
      poll: {
        options: options.map(option => ({
          text: option,
          votes: []
        })),
        isAnonymous,
        allowMultipleVotes,
        endDate,
        showResults,
        totalVotes: 0
      }
    });

    await message.save();
    return message;
  }

  async voteOnPoll(messageId, userId, optionIndexes) {
    const message = await Message.findById(messageId);
    if (!message || message.type !== 'poll') {
      throw new Error('Poll not found');
    }

    if (message.poll.endDate && new Date() > message.poll.endDate) {
      throw new Error('Poll has ended');
    }

    if (!message.poll.allowMultipleVotes && optionIndexes.length > 1) {
      throw new Error('Multiple votes not allowed');
    }

    // Remove previous votes if not allowing multiple votes
    if (!message.poll.allowMultipleVotes) {
      message.poll.options.forEach(option => {
        option.votes = option.votes.filter(vote => vote.user.toString() !== userId.toString());
      });
    }

    // Add new votes
    optionIndexes.forEach(index => {
      if (index >= 0 && index < message.poll.options.length) {
        message.poll.options[index].votes.push({
          user: userId,
          timestamp: new Date()
        });
      }
    });

    message.poll.totalVotes = message.poll.options.reduce(
      (total, option) => total + option.votes.length,
      0
    );

    await message.save();
    return message;
  }

  async getPollResults(messageId, userId) {
    const message = await Message.findById(messageId);
    if (!message || message.type !== 'poll') {
      throw new Error('Poll not found');
    }

    if (!message.poll.showResults) {
      throw new Error('Results are not visible');
    }

    const results = message.poll.options.map(option => ({
      text: option.text,
      votes: message.poll.isAnonymous ? option.votes.length : option.votes,
      percentage: message.poll.totalVotes > 0
        ? (option.votes.length / message.poll.totalVotes) * 100
        : 0
    }));

    return {
      question: message.content,
      results,
      totalVotes: message.poll.totalVotes,
      endDate: message.poll.endDate,
      hasEnded: message.poll.endDate ? new Date() > message.poll.endDate : false
    };
  }

  async endPoll(messageId, userId) {
    const message = await Message.findById(messageId);
    if (!message || message.type !== 'poll') {
      throw new Error('Poll not found');
    }

    if (message.sender.toString() !== userId.toString()) {
      throw new Error('Only poll creator can end the poll');
    }

    message.poll.endDate = new Date();
    await message.save();
    return message;
  }

  async getActivePolls(userId) {
    const userGroups = await this.getUserGroups(userId);
    
    return Message.find({
      type: 'poll',
      $or: [
        { sender: userId },
        { group: { $in: userGroups } }
      ],
      'poll.endDate': { $gt: new Date() }
    })
    .sort({ createdAt: -1 })
    .populate('sender', 'username profilePicture')
    .populate('group', 'name');
  }

  async getUserVotes(userId) {
    const polls = await Message.find({
      type: 'poll',
      'poll.options.votes.user': userId
    });

    return polls.map(poll => ({
      pollId: poll._id,
      question: poll.content,
      votes: poll.poll.options
        .filter(option => option.votes.some(vote => vote.user.toString() === userId.toString()))
        .map(option => option.text)
    }));
  }

  async getPollStats(userId) {
    const polls = await Message.find({
      type: 'poll',
      sender: userId
    });

    const stats = {
      totalPolls: polls.length,
      totalVotes: polls.reduce((total, poll) => total + poll.poll.totalVotes, 0),
      averageVotesPerPoll: polls.length > 0
        ? polls.reduce((total, poll) => total + poll.poll.totalVotes, 0) / polls.length
        : 0,
      pollsByType: {
        anonymous: polls.filter(poll => poll.poll.isAnonymous).length,
        multipleVotes: polls.filter(poll => poll.poll.allowMultipleVotes).length
      }
    };

    return stats;
  }

  async getUserGroups(userId) {
    const groups = await Group.find({ members: userId }).select('_id');
    return groups.map(group => group._id);
  }
}

module.exports = new PollService(); 