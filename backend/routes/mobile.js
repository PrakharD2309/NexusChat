const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const mobileService = require('../services/mobileService');

// Register device for push notifications
router.post('/device', auth, async (req, res) => {
  try {
    const devices = await mobileService.registerDevice(req.user.id, req.body);
    res.json(devices);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Unregister device
router.delete('/device/:deviceId', auth, async (req, res) => {
  try {
    await mobileService.unregisterDevice(req.user.id, req.params.deviceId);
    res.json({ message: 'Device unregistered successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Enable offline mode
router.post('/offline-mode', auth, async (req, res) => {
  try {
    await mobileService.enableOfflineMode(req.user.id);
    res.json({ message: 'Offline mode enabled' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Disable offline mode
router.delete('/offline-mode', auth, async (req, res) => {
  try {
    await mobileService.disableOfflineMode(req.user.id);
    res.json({ message: 'Offline mode disabled' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Sync offline data
router.get('/offline-data', auth, async (req, res) => {
  try {
    const data = await mobileService.syncOfflineData(req.user.id);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Sync online data
router.get('/online-data', auth, async (req, res) => {
  try {
    const data = await mobileService.syncOnlineData(req.user.id);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Handle background sync
router.post('/background-sync', auth, async (req, res) => {
  try {
    const result = await mobileService.handleBackgroundSync(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get mobile UI settings
router.get('/settings', auth, async (req, res) => {
  try {
    const settings = await mobileService.getMobileUISettings(req.user.id);
    res.json(settings);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update mobile UI settings
router.put('/settings', auth, async (req, res) => {
  try {
    const settings = await mobileService.updateMobileUISettings(req.user.id, req.body);
    res.json(settings);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Handle app state
router.post('/app-state', auth, async (req, res) => {
  try {
    await mobileService.handleAppState(req.user.id, req.body.state);
    res.json({ message: 'App state updated successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router; 