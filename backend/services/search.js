const Message = require('../models/Message');
const User = require('../models/User');

class SearchService {
  async searchMessages(userId, query, options = {}) {
    const {
      limit = 20,
      skip = 0,
      startDate,
      endDate,
      type,
      senderId,
      recipientId
    } = options;

    const searchQuery = {
      $or: [
        { sender: userId },
        { recipient: userId }
      ],
      content: { $regex: query, $options: 'i' }
    };

    if (startDate) {
      searchQuery.createdAt = { $gte: new Date(startDate) };
    }

    if (endDate) {
      searchQuery.createdAt = { ...searchQuery.createdAt, $lte: new Date(endDate) };
    }

    if (type) {
      searchQuery.type = type;
    }

    if (senderId) {
      searchQuery.sender = senderId;
    }

    if (recipientId) {
      searchQuery.recipient = recipientId;
    }

    const messages = await Message.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name avatar')
      .populate('recipient', 'name avatar');

    const total = await Message.countDocuments(searchQuery);

    return {
      messages,
      total,
      page: Math.floor(skip / limit) + 1,
      pages: Math.ceil(total / limit)
    };
  }

  async searchUsers(query, options = {}) {
    const {
      limit = 20,
      skip = 0,
      excludeUserId,
      onlineOnly = false
    } = options;

    const searchQuery = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    };

    if (excludeUserId) {
      searchQuery._id = { $ne: excludeUserId };
    }

    if (onlineOnly) {
      searchQuery.status = 'online';
    }

    const users = await User.find(searchQuery)
      .select('-password')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(searchQuery);

    return {
      users,
      total,
      page: Math.floor(skip / limit) + 1,
      pages: Math.ceil(total / limit)
    };
  }

  async searchGlobal(query, userId, options = {}) {
    const {
      limit = 20,
      skip = 0,
      types = ['messages', 'users']
    } = options;

    const results = {
      messages: [],
      users: [],
      total: 0
    };

    if (types.includes('messages')) {
      const messageResults = await this.searchMessages(userId, query, { limit, skip });
      results.messages = messageResults.messages;
      results.total += messageResults.total;
    }

    if (types.includes('users')) {
      const userResults = await this.searchUsers(query, { limit, skip, excludeUserId: userId });
      results.users = userResults.users;
      results.total += userResults.total;
    }

    return results;
  }
}

module.exports = new SearchService(); 