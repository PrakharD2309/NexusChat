const fs = require('fs').promises;
const path = require('path');
const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
  }

  async ensureBackupDir() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  async createBackup(userId) {
    try {
      await this.ensureBackupDir();

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `backup_${userId}_${timestamp}.json`);

      // Get all messages
      const messages = await Message.find({
        $or: [
          { sender: userId },
          { recipient: userId }
        ],
        isDeleted: false,
        'deletedFor.user': { $ne: userId }
      })
        .populate('sender', 'name email')
        .populate('recipient', 'name email')
        .populate('group', 'name description')
        .lean();

      // Get user's groups
      const groups = await Group.find({
        'members.user': userId
      })
        .populate('members.user', 'name email')
        .populate('admins', 'name email')
        .lean();

      const backup = {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt
        },
        messages,
        groups,
        backupDate: new Date(),
        version: '1.0'
      };

      await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));
      return backupPath;
    } catch (error) {
      console.error('Backup creation error:', error);
      throw error;
    }
  }

  async restoreBackup(backupPath) {
    try {
      const backupData = await fs.readFile(backupPath, 'utf8');
      const backup = JSON.parse(backupData);

      // Verify backup version
      if (backup.version !== '1.0') {
        throw new Error('Unsupported backup version');
      }

      // Restore messages
      for (const message of backup.messages) {
        const existingMessage = await Message.findById(message._id);
        if (!existingMessage) {
          await Message.create({
            ...message,
            _id: message._id,
            sender: message.sender._id,
            recipient: message.recipient?._id,
            group: message.group?._id
          });
        }
      }

      // Restore groups
      for (const group of backup.groups) {
        const existingGroup = await Group.findById(group._id);
        if (!existingGroup) {
          await Group.create({
            ...group,
            _id: group._id,
            creator: group.creator,
            members: group.members.map(m => ({
              user: m.user._id,
              role: m.role,
              joinedAt: m.joinedAt
            })),
            admins: group.admins.map(a => a._id)
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Backup restoration error:', error);
      throw error;
    }
  }

  async listBackups(userId) {
    try {
      await this.ensureBackupDir();
      const files = await fs.readdir(this.backupDir);
      
      const backups = files
        .filter(file => file.startsWith(`backup_${userId}_`))
        .map(file => ({
          filename: file,
          path: path.join(this.backupDir, file),
          date: new Date(file.split('_')[2].replace('.json', '').replace(/-/g, ':'))
        }))
        .sort((a, b) => b.date - a.date);

      return backups;
    } catch (error) {
      console.error('List backups error:', error);
      throw error;
    }
  }

  async deleteBackup(backupPath) {
    try {
      await fs.unlink(backupPath);
      return true;
    } catch (error) {
      console.error('Delete backup error:', error);
      throw error;
    }
  }
}

module.exports = new BackupService(); 