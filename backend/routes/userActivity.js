const express = require('express');
const router = express.Router();
const UserActivity = require('../models/UserActivity');
const auth = require('../middleware/auth');
const pagination = require('../middleware/pagination');

// Get user's activity logs
router.get('/', auth, pagination(), async (req, res) => {
  try {
    const { action, startDate, endDate } = req.query;
    const query = { user: req.user._id };

    if (action) {
      query.action = action;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const activities = await UserActivity.find(query)
      .sort({ createdAt: -1 })
      .skip(req.pagination.skip)
      .limit(req.pagination.limit);

    const total = await UserActivity.countDocuments(query);

    res.json({
      activities,
      pagination: {
        total,
        page: req.pagination.page,
        limit: req.pagination.limit,
        pages: Math.ceil(total / req.pagination.limit)
      }
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ message: 'Error fetching activity logs' });
  }
});

// Get activity statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const matchStage = { user: req.user._id };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.createdAt.$lte = new Date(endDate);
      }
    }

    const stats = await UserActivity.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json(stats);
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({ message: 'Error fetching activity statistics' });
  }
});

// Clear activity logs
router.delete('/', auth, async (req, res) => {
  try {
    const { before } = req.query;
    const query = { user: req.user._id };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    await UserActivity.deleteMany(query);
    res.json({ message: 'Activity logs cleared successfully' });
  } catch (error) {
    console.error('Clear activity logs error:', error);
    res.status(500).json({ message: 'Error clearing activity logs' });
  }
});

module.exports = router; 