const express = require('express');
const router = express.Router();
const backupService = require('../services/backup');
const auth = require('../middleware/auth');
const path = require('path');

// Create a new backup
router.post('/', auth, async (req, res) => {
  try {
    const backupPath = await backupService.createBackup(req.user._id);
    res.json({
      message: 'Backup created successfully',
      path: backupPath
    });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({ message: 'Error creating backup' });
  }
});

// List user's backups
router.get('/', auth, async (req, res) => {
  try {
    const backups = await backupService.listBackups(req.user._id);
    res.json(backups);
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({ message: 'Error listing backups' });
  }
});

// Restore from backup
router.post('/restore/:filename', auth, async (req, res) => {
  try {
    const backupPath = path.join(__dirname, '../backups', req.params.filename);
    await backupService.restoreBackup(backupPath);
    res.json({ message: 'Backup restored successfully' });
  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({ message: 'Error restoring backup' });
  }
});

// Delete backup
router.delete('/:filename', auth, async (req, res) => {
  try {
    const backupPath = path.join(__dirname, '../backups', req.params.filename);
    await backupService.deleteBackup(backupPath);
    res.json({ message: 'Backup deleted successfully' });
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({ message: 'Error deleting backup' });
  }
});

module.exports = router; 