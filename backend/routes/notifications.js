const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const pagination = require('../middleware/pagination');

// Get user's notifications
router.get('/', auth, pagination(), async (req, res) => {
  try {
    const notifications = await Notification.getUserNotifications(req.user._id, {
      limit: req.pagination.limit,
      skip: req.pagination.skip,
      unreadOnly: req.query.unreadOnly === 'true'
    });

    const total = await Notification.countDocuments({ recipient: req.user._id });
    const unreadCount = await Notification.getUnreadCount(req.user._id);

    res.json({
      notifications,
      pagination: {
        total,
        unreadCount,
        page: req.pagination.page,
        limit: req.pagination.limit
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Mark notification as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.markAsRead();
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error marking notification as read' });
  }
});

// Mark all notifications as read
router.patch('/read-all', auth, async (req, res) => {
  try {
    await Notification.markAllAsRead(req.user._id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Error marking all notifications as read' });
  }
});

// Delete notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

// Delete all read notifications
router.delete('/read', auth, async (req, res) => {
  try {
    await Notification.deleteMany({
      recipient: req.user._id,
      read: true
    });

    res.json({ message: 'All read notifications deleted' });
  } catch (error) {
    console.error('Error deleting read notifications:', error);
    res.status(500).json({ message: 'Error deleting read notifications' });
  }
});

module.exports = router; 