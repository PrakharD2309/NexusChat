const express = require('express');
const router = express.Router();
const reactionService = require('../services/reactionService');
const auth = require('../middleware/auth');

// Add reaction to message
router.post('/:messageId', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await reactionService.addReaction(req.params.messageId, req.user.id, emoji);
    res.json(message);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Remove reaction from message
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await reactionService.removeReaction(req.params.messageId, req.user.id, emoji);
    res.json(message);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get reactions for a message
router.get('/message/:messageId', auth, async (req, res) => {
  try {
    const reactions = await reactionService.getMessageReactions(req.params.messageId);
    res.json(reactions);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get user's reactions
router.get('/user', auth, async (req, res) => {
  try {
    const reactions = await reactionService.getUserReactions(req.user.id);
    res.json(reactions);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get popular reactions
router.get('/popular', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const reactions = await reactionService.getPopularReactions(req.user.id, limit);
    res.json(reactions);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get reaction statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await reactionService.getReactionStats(req.user.id);
    res.json(stats);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router; 