const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

class ExportService {
  async exportMessages(userId, format = 'json', filters = {}) {
    const messages = await this.getFilteredMessages(userId, filters);
    
    switch (format.toLowerCase()) {
      case 'json':
        return this.exportToJSON(messages);
      case 'csv':
        return this.exportToCSV(messages);
      case 'excel':
        return this.exportToExcel(messages);
      case 'pdf':
        return this.exportToPDF(messages);
      case 'zip':
        return this.exportToZip(messages);
      default:
        throw new Error('Unsupported export format');
    }
  }

  async getFilteredMessages(userId, filters) {
    const {
      startDate,
      endDate,
      messageType,
      groupId,
      senderId,
      hasAttachments,
      isPinned,
      isArchived
    } = filters;

    const query = {
      $or: [
        { recipient: userId },
        { sender: userId },
        { group: { $in: await this.getUserGroups(userId) } }
      ],
      isDeleted: false
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (messageType) query.type = messageType;
    if (groupId) query.group = groupId;
    if (senderId) query.sender = senderId;
    if (hasAttachments) query.fileUrl = { $exists: true };
    if (isPinned) query.isPinned = true;
    if (isArchived) query.isArchived = true;

    return Message.find(query)
      .sort({ createdAt: 1 })
      .populate('sender', 'username email fullName')
      .populate('recipient', 'username email fullName')
      .populate('group', 'name description');
  }

  async exportToJSON(messages) {
    const exportData = messages.map(msg => ({
      id: msg._id,
      type: msg.type,
      content: msg.content,
      sender: msg.sender ? {
        id: msg.sender._id,
        username: msg.sender.username,
        email: msg.sender.email,
        fullName: msg.sender.fullName
      } : null,
      recipient: msg.recipient ? {
        id: msg.recipient._id,
        username: msg.recipient.username,
        email: msg.recipient.email,
        fullName: msg.recipient.fullName
      } : null,
      group: msg.group ? {
        id: msg.group._id,
        name: msg.group.name,
        description: msg.group.description
      } : null,
      fileUrl: msg.fileUrl,
      fileName: msg.fileName,
      fileSize: msg.fileSize,
      fileType: msg.fileType,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt
    }));

    return {
      data: JSON.stringify(exportData, null, 2),
      filename: `messages_${new Date().toISOString()}.json`,
      contentType: 'application/json'
    };
  }

  async exportToCSV(messages) {
    const fields = [
      'id',
      'type',
      'content',
      'sender',
      'recipient',
      'group',
      'fileUrl',
      'fileName',
      'fileSize',
      'fileType',
      'createdAt',
      'updatedAt'
    ];

    const data = messages.map(msg => ({
      id: msg._id,
      type: msg.type,
      content: msg.content,
      sender: msg.sender ? msg.sender.username : '',
      recipient: msg.recipient ? msg.recipient.username : '',
      group: msg.group ? msg.group.name : '',
      fileUrl: msg.fileUrl || '',
      fileName: msg.fileName || '',
      fileSize: msg.fileSize || '',
      fileType: msg.fileType || '',
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt
    }));

    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    return {
      data: csv,
      filename: `messages_${new Date().toISOString()}.csv`,
      contentType: 'text/csv'
    };
  }

  async exportToExcel(messages) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Messages');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Content', key: 'content', width: 50 },
      { header: 'Sender', key: 'sender', width: 20 },
      { header: 'Recipient', key: 'recipient', width: 20 },
      { header: 'Group', key: 'group', width: 20 },
      { header: 'File Name', key: 'fileName', width: 30 },
      { header: 'File Type', key: 'fileType', width: 15 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 }
    ];

    messages.forEach(msg => {
      worksheet.addRow({
        id: msg._id,
        type: msg.type,
        content: msg.content,
        sender: msg.sender ? msg.sender.username : '',
        recipient: msg.recipient ? msg.recipient.username : '',
        group: msg.group ? msg.group.name : '',
        fileName: msg.fileName || '',
        fileType: msg.fileType || '',
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      data: buffer,
      filename: `messages_${new Date().toISOString()}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  async exportToPDF(messages) {
    const doc = new PDFDocument();
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));

    // Add title
    doc.fontSize(20).text('Message Export', { align: 'center' });
    doc.moveDown();

    messages.forEach(msg => {
      doc.fontSize(12).text(`Type: ${msg.type}`);
      doc.fontSize(10).text(`Content: ${msg.content}`);
      doc.text(`Sender: ${msg.sender ? msg.sender.username : 'N/A'}`);
      doc.text(`Recipient: ${msg.recipient ? msg.recipient.username : 'N/A'}`);
      doc.text(`Group: ${msg.group ? msg.group.name : 'N/A'}`);
      if (msg.fileName) {
        doc.text(`File: ${msg.fileName} (${msg.fileType})`);
      }
      doc.text(`Created: ${msg.createdAt}`);
      doc.moveDown();
    });

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          data: buffer,
          filename: `messages_${new Date().toISOString()}.pdf`,
          contentType: 'application/pdf'
        });
      });

      doc.on('error', reject);
    });
  }

  async exportToZip(messages) {
    const archive = archiver('zip');
    const chunks = [];

    archive.on('data', chunk => chunks.push(chunk));

    // Add JSON file
    const jsonExport = await this.exportToJSON(messages);
    archive.append(jsonExport.data, { name: 'messages.json' });

    // Add CSV file
    const csvExport = await this.exportToCSV(messages);
    archive.append(csvExport.data, { name: 'messages.csv' });

    // Add attachments
    for (const msg of messages) {
      if (msg.fileUrl) {
        const filePath = path.join(process.cwd(), msg.fileUrl);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: `attachments/${msg.fileName}` });
        }
      }
    }

    archive.finalize();

    return new Promise((resolve, reject) => {
      archive.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          data: buffer,
          filename: `messages_${new Date().toISOString()}.zip`,
          contentType: 'application/zip'
        });
      });

      archive.on('error', reject);
    });
  }

  async getUserGroups(userId) {
    const groups = await Group.find({ members: userId }).select('_id');
    return groups.map(group => group._id);
  }
}

module.exports = new ExportService(); 