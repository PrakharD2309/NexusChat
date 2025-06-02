const express = require('express');
const router = express.Router();
const threadService = require('../services/threadService');
const auth = require('../middleware/auth');

// Create a reply in a thread
router.post('/:messageId/reply', auth, async (req, res) => {
  try {
    const reply = await threadService.createThread(req.params.messageId, {
      ...req.body,
      sender: req.user.id
    });
    res.json(reply);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all replies in a thread
router.get('/:threadId/replies', auth, async (req, res) => {
  try {
    const replies = await threadService.getThreadReplies(req.params.threadId, req.user.id);
    res.json(replies);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get thread participants
router.get('/:threadId/participants', auth, async (req, res) => {
  try {
    const participants = await threadService.getThreadParticipants(req.params.threadId);
    res.json(participants);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get thread statistics
router.get('/:threadId/stats', auth, async (req, res) => {
  try {
    const stats = await threadService.getThreadStats(req.params.threadId);
    res.json(stats);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get user's threads
router.get('/user', auth, async (req, res) => {
  try {
    const threads = await threadService.getUserThreads(req.user.id);
    res.json(threads);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Mark thread as read
router.post('/:threadId/read', auth, async (req, res) => {
  try {
    const count = await threadService.markThreadAsRead(req.params.threadId, req.user.id);
    res.json({ markedAsRead: count });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router; 