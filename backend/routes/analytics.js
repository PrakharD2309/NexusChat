const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Get analytics data
router.get('/', auth, async (req, res) => {
  try {
    res.json({ message: 'Analytics endpoint' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 