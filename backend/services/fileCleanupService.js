const fs = require('fs');
const path = require('path');
const Message = require('../models/Message');

class FileCleanupService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../uploads');
    this.cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.retentionPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  start() {
    // Run cleanup immediately on start
    this.cleanup();
    
    // Schedule regular cleanup
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  async cleanup() {
    try {
      console.log('Starting file cleanup...');
      
      // Get all files in uploads directory
      const files = await this.getAllFiles(this.uploadsDir);
      
      // Get all message files from database
      const messageFiles = await Message.find({
        type: { $in: ['image', 'video', 'audio', 'document'] },
        createdAt: { $gt: new Date(Date.now() - this.retentionPeriod) }
      }).select('filePath');

      const validFilePaths = new Set(messageFiles.map(msg => msg.filePath));

      // Delete files that are not referenced in messages
      for (const file of files) {
        const relativePath = path.relative(this.uploadsDir, file);
        if (!validFilePaths.has(relativePath)) {
          await this.deleteFile(file);
        }
      }

      console.log('File cleanup completed');
    } catch (error) {
      console.error('Error during file cleanup:', error);
    }
  }

  async getAllFiles(dir) {
    const files = [];
    
    async function traverse(currentDir) {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          await traverse(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    }

    await traverse(dir);
    return files;
  }

  async deleteFile(filePath) {
    try {
      await fs.promises.unlink(filePath);
      console.log(`Deleted file: ${filePath}`);
    } catch (error) {
      console.error(`Error deleting file ${filePath}:`, error);
    }
  }
}

module.exports = new FileCleanupService(); 