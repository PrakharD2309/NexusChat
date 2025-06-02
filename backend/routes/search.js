const express = require('express');
const router = express.Router();
const searchService = require('../services/search');
const auth = require('../middleware/auth');
const pagination = require('../middleware/pagination');

// Search messages
router.get('/messages', auth, pagination(), async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const results = await searchService.searchMessages(req.user._id, query, {
      limit: req.pagination.limit,
      skip: req.pagination.skip,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      type: req.query.type,
      senderId: req.query.senderId,
      recipientId: req.query.recipientId
    });

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Error performing search' });
  }
});

// Search users
router.get('/users', auth, pagination(), async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const results = await searchService.searchUsers(query, {
      limit: req.pagination.limit,
      skip: req.pagination.skip,
      excludeUserId: req.user._id,
      onlineOnly: req.query.onlineOnly === 'true'
    });

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Error performing search' });
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

module.exports = router; 