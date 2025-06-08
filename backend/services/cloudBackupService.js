const { google } = require('googleapis');
const User = require('../models/User');
const Message = require('../models/Message');
const Group = require('../models/Group');
const Call = require('../models/Call');
const Task = require('../models/Task');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

class CloudBackupService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  // Get Google Drive API client
  async getDriveClient(userId) {
    const user = await User.findById(userId);
    if (!user.driveToken) {
      throw new Error('Google Drive not connected');
    }

    this.oauth2Client.setCredentials({
      access_token: user.driveToken
    });

    return google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  // Connect user's Google Drive
  async connectDrive(userId, code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    await User.findByIdAndUpdate(userId, {
      driveToken: tokens.access_token,
      driveRefreshToken: tokens.refresh_token,
      driveTokenExpiry: new Date(tokens.expiry_date)
    });
  }

  // Create backup folder in Google Drive
  async createBackupFolder(userId) {
    const drive = await this.getDriveClient(userId);
    const folderName = `ChatApp_Backup_${new Date().toISOString().split('T')[0]}`;

    const folder = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    });

    return folder.data.id;
  }

  // Create backup archive
  async createBackupArchive(userId) {
    const backupPath = path.join(__dirname, '..', 'temp', `backup_${userId}_${Date.now()}.zip`);
    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => resolve(backupPath));
      archive.on('error', reject);

      archive.pipe(output);

      // Add data to archive
      this.addDataToArchive(archive, userId)
        .then(() => archive.finalize())
        .catch(reject);
    });
  }

  // Add data to backup archive
  async addDataToArchive(archive, userId) {
    // Add messages
    const messages = await Message.find({
      $or: [
        { sender: userId },
        { recipient: userId }
      ]
    }).populate('sender recipient');
    archive.append(JSON.stringify(messages, null, 2), { name: 'messages.json' });

    // Add groups
    const groups = await Group.find({
      'members.user': userId
    }).populate('members.user');
    archive.append(JSON.stringify(groups, null, 2), { name: 'groups.json' });

    // Add calls
    const calls = await Call.find({
      $or: [
        { initiator: userId },
        { participants: userId }
      ]
    });
    archive.append(JSON.stringify(calls, null, 2), { name: 'calls.json' });

    // Add tasks
    const tasks = await Task.find({
      $or: [
        { creator: userId },
        { assignee: userId }
      ]
    });
    archive.append(JSON.stringify(tasks, null, 2), { name: 'tasks.json' });

    // Add user settings
    const user = await User.findById(userId);
    archive.append(JSON.stringify({
      settings: user.settings,
      preferences: user.preferences
    }, null, 2), { name: 'settings.json' });
  }

  // Upload backup to Google Drive
  async uploadBackup(userId, filePath) {
    const drive = await this.getDriveClient(userId);
    const folderId = await this.createBackupFolder(userId);

    const response = await drive.files.create({
      requestBody: {
        name: path.basename(filePath),
        parents: [folderId]
      },
      media: {
        mimeType: 'application/zip',
        body: fs.createReadStream(filePath)
      }
    });

    return response.data;
  }

  // Create and upload backup
  async createBackup(userId) {
    try {
      // Create backup archive
      const backupPath = await this.createBackupArchive(userId);

      // Upload to Google Drive
      const file = await this.uploadBackup(userId, backupPath);

      // Clean up temporary file
      await unlinkAsync(backupPath);

      return file;
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw error;
    }
  }

  // Schedule automatic backup
  async scheduleBackup(userId, schedule) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.settings.backupSchedule = schedule;
    await user.save();

    // Create initial backup
    await this.createBackup(userId);
  }

  // Get backup history
  async getBackupHistory(userId) {
    const drive = await this.getDriveClient(userId);
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and name contains 'ChatApp_Backup_'",
      orderBy: 'createdTime desc',
      fields: 'files(id, name, createdTime)'
    });

    return response.data.files;
  }

  // Download backup
  async downloadBackup(userId, fileId) {
    const drive = await this.getDriveClient(userId);
    const response = await drive.files.get({
      fileId,
      alt: 'media'
    });

    const downloadPath = path.join(__dirname, '..', 'temp', `download_${fileId}.zip`);
    await writeFileAsync(downloadPath, response.data);

    return downloadPath;
  }

  // Delete backup
  async deleteBackup(userId, fileId) {
    const drive = await this.getDriveClient(userId);
    await drive.files.delete({ fileId });
  }

  // Refresh Google Drive token
  async refreshToken(userId) {
    const user = await User.findById(userId);
    if (!user.driveRefreshToken) {
      throw new Error('No refresh token available');
    }

    this.oauth2Client.setCredentials({
      refresh_token: user.driveRefreshToken
    });

    const { tokens } = await this.oauth2Client.refreshAccessToken();
    await User.findByIdAndUpdate(userId, {
      driveToken: tokens.access_token,
      driveTokenExpiry: new Date(tokens.expiry_date)
    });

    return tokens;
  }
}

// Export an instance of the service
module.exports = new CloudBackupService(); 