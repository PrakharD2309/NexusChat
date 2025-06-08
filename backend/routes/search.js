const express = require('express');
const router = express.Router();
const searchService = require('../services/search');
const auth = require('../middleware/auth');
const pagination = require('../middleware/pagination');
const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');

// Search messages
router.get('/messages', auth, pagination(), async (req, res) => {
  try {
    const { query, type } = req.query;
    const searchQuery = {
      $or: [
        { content: { $regex: query, $options: 'i' } },
        { fileName: { $regex: query, $options: 'i' } }
      ]
    };

    // Filter by message type if specified
    if (type) {
      searchQuery.type = type;
    }

    // Only search messages in conversations the user is part of
    searchQuery.$or.push(
      { sender: req.user._id },
      { recipient: req.user._id },
      { group: { $in: await getGroupIds(req.user._id) } }
    );

    const messages = await Message.find(searchQuery)
      .populate('sender', 'name avatar')
      .populate('recipient', 'name avatar')
      .populate('group', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(messages);
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ message: 'Error searching messages' });
  }
});

// Search users
router.get('/users', auth, pagination(), async (req, res) => {
  try {
    const { query } = req.query;
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ],
      _id: { $ne: req.user._id } // Exclude current user
    })
    .select('name email avatar status')
    .limit(20);

    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Error searching users' });
  }
});

// Search groups
router.get('/groups', auth, async (req, res) => {
  try {
    const { query } = req.query;
    const groups = await Group.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ],
      $or: [
        { 'members.user': req.user._id },
        { settings: { isPrivate: false } }
      ]
    })
    .populate('members.user', 'name avatar')
    .populate('lastMessage')
    .limit(20);

    res.json(groups);
  } catch (error) {
    console.error('Error searching groups:', error);
    res.status(500).json({ message: 'Error searching groups' });
  }
});

// Global search (messages and users)
router.get('/global', auth, pagination(), async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const results = await searchService.searchGlobal(query, req.user._id, {
      limit: req.pagination.limit,
      skip: req.pagination.skip,
      types: req.query.types ? req.query.types.split(',') : ['messages', 'users']
    });

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Error performing search' });
  }
});

// Helper function to get user's group IDs
async function getGroupIds(userId) {
  const groups = await Group.find({ 'members.user': userId }).select('_id');
  return groups.map(group => group._id);
}

module.exports = router; 