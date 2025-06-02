const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const cloudBackupService = require('../services/cloudBackupService');
const fs = require('fs');

// Connect Google Drive
router.post('/connect', auth, async (req, res) => {
  try {
    await cloudBackupService.connectDrive(req.user.id, req.body.code);
    res.json({ message: 'Google Drive connected successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Create backup
router.post('/backup', auth, async (req, res) => {
  try {
    const backup = await cloudBackupService.createBackup(req.user.id);
    res.json(backup);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Schedule backup
router.post('/schedule', auth, async (req, res) => {
  try {
    await cloudBackupService.scheduleBackup(req.user.id, req.body.schedule);
    res.json({ message: 'Backup scheduled successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get backup history
router.get('/history', auth, async (req, res) => {
  try {
    const history = await cloudBackupService.getBackupHistory(req.user.id);
    res.json(history);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Download backup
router.get('/download/:fileId', auth, async (req, res) => {
  try {
    const filePath = await cloudBackupService.downloadBackup(req.user.id, req.params.fileId);
    res.download(filePath, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
      }
      // Clean up the temporary file after download
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting temporary file:', unlinkErr);
        }
      });
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete backup
router.delete('/:fileId', auth, async (req, res) => {
  try {
    await cloudBackupService.deleteBackup(req.user.id, req.params.fileId);
    res.json({ message: 'Backup deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router; 