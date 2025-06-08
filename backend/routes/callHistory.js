const express = require('express');
const router = express.Router();
const CallHistory = require('../models/CallHistory');
const auth = require('../middleware/auth');

// Get call history
router.get('/', auth, async (req, res) => {
  try {
    const calls = await CallHistory.find({
      participants: req.user._id
    })
    .populate('participants', 'name avatar')
    .sort({ startTime: -1 })
    .limit(50);

    res.json(calls);
  } catch (error) {
    console.error('Error fetching call history:', error);
    res.status(500).json({ message: 'Error fetching call history' });
  }
});

// Create call history entry
router.post('/', auth, async (req, res) => {
  try {
    const { roomId, type, duration, participants } = req.body;

    const callHistory = new CallHistory({
      roomId,
      type,
      duration,
      participants: [...participants, req.user._id],
      endTime: new Date()
    });

    await callHistory.save();
    await callHistory.populate('participants', 'name avatar');

    res.status(201).json(callHistory);
  } catch (error) {
    console.error('Error creating call history:', error);
    res.status(500).json({ message: 'Error creating call history' });
  }
});

// Delete call history entry
router.delete('/:id', auth, async (req, res) => {
  try {
    const call = await CallHistory.findById(req.params.id);
    
    if (!call) {
      return res.status(404).json({ message: 'Call history not found' });
    }

    if (!call.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await call.remove();
    res.json({ message: 'Call history deleted' });
  } catch (error) {
    console.error('Error deleting call history:', error);
    res.status(500).json({ message: 'Error deleting call history' });
  }
});

module.exports = router; 