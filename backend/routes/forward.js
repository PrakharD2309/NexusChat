const express = require('express');
const router = express.Router();
const forwardService = require('../services/forwardService');
const auth = require('../middleware/auth');

// Forward message to recipients
router.post('/:messageId/forward', auth, async (req, res) => {
  try {
    const { recipients } = req.body;
    const forwardedMessages = await forwardService.forwardMessage(
      req.params.messageId,
      req.user.id,
      recipients
    );
    res.json(forwardedMessages);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Create shareable link
router.post('/:messageId/share', auth, async (req, res) => {
  try {
    const { expiresAt, maxAccess } = req.body;
    const link = await forwardService.createShareableLink(
      req.params.messageId,
      req.user.id,
      { expiresAt, maxAccess }
    );
    res.json(link);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Access shared message
router.get('/shared/:token', async (req, res) => {
  try {
    const sharedMessage = await forwardService.accessSharedMessage(req.params.token);
    res.json(sharedMessage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Revoke shareable link
router.delete('/:messageId/share/:token', auth, async (req, res) => {
  try {
    const result = await forwardService.revokeShareableLink(
      req.params.messageId,
      req.user.id,
      req.params.token
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get forward history
router.get('/:messageId/history', auth, async (req, res) => {
  try {
    const history = await forwardService.getForwardHistory(req.params.messageId);
    res.json(history);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get user's shared links
router.get('/shared-links', auth, async (req, res) => {
  try {
    const links = await forwardService.getSharedLinks(req.user.id);
    res.json(links);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router; 