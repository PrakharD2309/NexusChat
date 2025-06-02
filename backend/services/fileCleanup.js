const fs = require('fs').promises;
const path = require('path');
const Message = require('../models/Message');

class FileCleanupService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../uploads');
    this.cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours
  }

  async start() {
    // Create uploads directory if it doesn't exist
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating uploads directory:', error);
    }

    // Run cleanup immediately and then on interval
    await this.cleanup();
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  async cleanup() {
    try {
      // Get all files in uploads directory
      const files = await fs.readdir(this.uploadsDir);
      
      // Get all file references from messages
      const messages = await Message.find({
        type: 'file',
        'metadata.fileUrl': { $exists: true }
      });

      const usedFiles = new Set(
        messages.map(msg => {
          const url = msg.metadata.fileUrl;
          return path.basename(url);
        })
      );

      // Delete unused files
      for (const file of files) {
        if (!usedFiles.has(file)) {
          const filePath = path.join(this.uploadsDir, file);
          try {
            await fs.unlink(filePath);
            console.log(`Deleted unused file: ${file}`);
          } catch (error) {
            console.error(`Error deleting file ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error during file cleanup:', error);
    }
  }

  async deleteFile(filename) {
    try {
      const filePath = path.join(this.uploadsDir, filename);
      await fs.unlink(filePath);
      console.log(`Deleted file: ${filename}`);
    } catch (error) {
      console.error(`Error deleting file ${filename}:`, error);
    }
  }
}

module.exports = new FileCleanupService(); 