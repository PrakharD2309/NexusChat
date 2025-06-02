const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const callScheduler = require('../services/callScheduler');

// Schedule a new call
router.post('/', auth, async (req, res) => {
  try {
    const callData = {
      ...req.body,
      initiator: req.user._id
    };
    const call = await callScheduler.scheduleCall(callData);
    res.status(201).json(call);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get user's scheduled calls
router.get('/', auth, async (req, res) => {
  try {
    const calls = await callScheduler.getUserScheduledCalls(req.user._id);
    res.json(calls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cancel a scheduled call
router.delete('/:callId', auth, async (req, res) => {
  try {
    const call = await callScheduler.cancelCall(req.params.callId);
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }
    res.json({ message: 'Call cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reschedule a call
router.put('/:callId', auth, async (req, res) => {
  try {
    const { newTime } = req.body;
    if (!newTime) {
      return res.status(400).json({ message: 'New time is required' });
    }
    const call = await callScheduler.rescheduleCall(req.params.callId, new Date(newTime));
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }
    res.json(call);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get call details
router.get('/:callId', auth, async (req, res) => {
  try {
    const call = await Call.findById(req.params.callId);
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }
    res.json(call);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update call participants
router.put('/:callId/participants', auth, async (req, res) => {
  try {
    const { participants } = req.body;
    const call = await Call.findById(req.params.callId);
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }
    if (call.initiator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    call.participants = participants.map(user => ({
      user,
      status: 'invited'
    }));
    await call.save();
    res.json(call);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update call settings
router.put('/:callId/settings', auth, async (req, res) => {
  try {
    const { settings } = req.body;
    const call = await Call.findById(req.params.callId);
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }
    if (call.initiator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    call.settings = { ...call.settings, ...settings };
    await call.save();
    res.json(call);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 