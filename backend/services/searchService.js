const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');

class SearchService {
  async searchMessages(userId, query, filters = {}) {
    const {
      startDate,
      endDate,
      messageType,
      groupId,
      senderId,
      hasAttachments,
      isPinned,
      isArchived,
      limit = 20,
      skip = 0
    } = filters;

    const searchQuery = {
      $or: [
        { content: { $regex: query, $options: 'i' } },
        { fileName: { $regex: query, $options: 'i' } }
      ],
      isDeleted: false,
      $or: [
        { recipient: userId },
        { sender: userId },
        { group: { $in: await this.getUserGroups(userId) } }
      ]
    };

    if (startDate || endDate) {
      searchQuery.createdAt = {};
      if (startDate) searchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) searchQuery.createdAt.$lte = new Date(endDate);
    }

    if (messageType) searchQuery.type = messageType;
    if (groupId) searchQuery.group = groupId;
    if (senderId) searchQuery.sender = senderId;
    if (hasAttachments) searchQuery.fileUrl = { $exists: true };
    if (isPinned) searchQuery.isPinned = true;
    if (isArchived) searchQuery.isArchived = true;

    const messages = await Message.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username profilePicture')
      .populate('recipient', 'username profilePicture')
      .populate('group', 'name');

    const total = await Message.countDocuments(searchQuery);

    return {
      messages,
      total,
      hasMore: total > skip + limit
    };
  }

  async searchUsers(query, limit = 20) {
    return User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { fullName: { $regex: query, $options: 'i' } }
      ]
    })
    .select('username email fullName profilePicture status')
    .limit(limit);
  }

  async searchGroups(userId, query, limit = 20) {
    const userGroups = await this.getUserGroups(userId);
    
    return Group.find({
      _id: { $in: userGroups },
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    })
    .select('name description membersCount avatar')
    .limit(limit);
  }

  async getUserGroups(userId) {
    const groups = await Group.find({ members: userId }).select('_id');
    return groups.map(group => group._id);
  }

  async getMessageStats(userId) {
    const stats = await Message.aggregate([
      {
        $match: {
          $or: [
            { recipient: userId },
            { sender: userId },
            { group: { $in: await this.getUserGroups(userId) } }
          ],
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    return stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});
  }

  async getRecentSearches(userId) {
    const user = await User.findById(userId);
    return user.recentSearches || [];
  }

  async addRecentSearch(userId, searchQuery) {
    const user = await User.findById(userId);
    const recentSearches = user.recentSearches || [];
    
    // Remove if already exists
    const index = recentSearches.indexOf(searchQuery);
    if (index > -1) {
      recentSearches.splice(index, 1);
    }
    
    // Add to beginning
    recentSearches.unshift(searchQuery);
    
    // Keep only last 10 searches
    user.recentSearches = recentSearches.slice(0, 10);
    await user.save();
    
    return user.recentSearches;
  }

  async clearRecentSearches(userId) {
    const user = await User.findById(userId);
    user.recentSearches = [];
    await user.save();
    return [];
  }
}

module.exports = new SearchService(); 