const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Group = require('../models/Group');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const pagination = require('../middleware/pagination');
const contentFilter = require('../middleware/contentFilter');
const { io } = require('../socket');

// Get messages between two users
router.get('/:userId', auth, pagination(), async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user._id }
      ],
      isDeleted: false,
      'deletedFor.user': { $ne: req.user._id }
    })
      .sort({ createdAt: -1 })
      .skip(req.pagination.skip)
      .limit(req.pagination.limit)
      .populate('sender', 'name avatar')
      .populate('recipient', 'name avatar')
      .populate('reactions.user', 'name avatar');

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Get group messages
router.get('/group/:groupId', auth, pagination(), async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group || !group.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view group messages' });
    }

    const messages = await Message.find({
      group: req.params.groupId,
      isDeleted: false,
      'deletedFor.user': { $ne: req.user._id }
    })
      .sort({ createdAt: -1 })
      .skip(req.pagination.skip)
      .limit(req.pagination.limit)
      .populate('sender', 'name avatar')
      .populate('reactions.user', 'name avatar');

    res.json(messages);
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({ message: 'Error fetching group messages' });
  }
});

// Send message to user
router.post('/:userId', auth, upload.single('file'), async (req, res) => {
  try {
    const { content, type = 'text' } = req.body;
    const message = new Message({
      sender: req.user._id,
      recipient: req.params.userId,
      content,
      type
    });

    if (req.file) {
      message.fileUrl = req.file.path;
      message.fileName = req.file.originalname;
      message.fileSize = req.file.size;
      message.fileType = req.file.mimetype;
    }

    await message.save();
    await message.populate('sender', 'name avatar');
    await message.populate('recipient', 'name avatar');

    // Emit socket event
    io.to(req.params.userId).emit('new_message', message);

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

// Send message to group
router.post('/group/:groupId', auth, upload.single('file'), async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group || !group.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to send group messages' });
    }

    const { content, type = 'text' } = req.body;
    const message = new Message({
      sender: req.user._id,
      group: req.params.groupId,
      content,
      type
    });

    if (req.file) {
      message.fileUrl = req.file.path;
      message.fileName = req.file.originalname;
      message.fileSize = req.file.size;
      message.fileType = req.file.mimetype;
    }

    await message.save();
    await message.populate('sender', 'name avatar');

    // Emit socket event to all group members
    group.members.forEach(member => {
      if (member.user.toString() !== req.user._id.toString()) {
        io.to(member.user.toString()).emit('new_group_message', message);
      }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Send group message error:', error);
    res.status(500).json({ message: 'Error sending group message' });
  }
});

// Forward message
router.post('/:messageId/forward', auth, async (req, res) => {
  try {
    const { recipientId, groupId } = req.body;
    const originalMessage = await Message.findById(req.params.messageId);
    
    if (!originalMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const message = new Message({
      sender: req.user._id,
      content: originalMessage.content,
      type: originalMessage.type,
      fileUrl: originalMessage.fileUrl,
      fileName: originalMessage.fileName,
      fileSize: originalMessage.fileSize,
      fileType: originalMessage.fileType,
      forwardedFrom: originalMessage._id
    });

    if (recipientId) {
      message.recipient = recipientId;
    } else if (groupId) {
      const group = await Group.findById(groupId);
      if (!group || !group.isMember(req.user._id)) {
        return res.status(403).json({ message: 'Not authorized to forward to this group' });
      }
      message.group = groupId;
    } else {
      return res.status(400).json({ message: 'Either recipientId or groupId is required' });
    }

    await message.save();
    await message.populate('sender', 'name avatar');
    if (message.recipient) {
      await message.populate('recipient', 'name avatar');
    }

    // Emit socket event
    if (message.recipient) {
      io.to(message.recipient.toString()).emit('new_message', message);
    } else {
      const group = await Group.findById(message.group);
      group.members.forEach(member => {
        if (member.user.toString() !== req.user._id.toString()) {
          io.to(member.user.toString()).emit('new_group_message', message);
        }
      });
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Forward message error:', error);
    res.status(500).json({ message: 'Error forwarding message' });
  }
});

// Add reaction to message
router.post('/:messageId/reactions', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    message.addReaction(req.user._id, emoji);
    await message.save();
    await message.populate('reactions.user', 'name avatar');

    // Emit socket event
    if (message.recipient) {
      io.to(message.recipient.toString()).emit('message_reaction', {
        messageId: message._id,
        reaction: message.reactions[message.reactions.length - 1]
      });
    } else if (message.group) {
      const group = await Group.findById(message.group);
      group.members.forEach(member => {
        if (member.user.toString() !== req.user._id.toString()) {
          io.to(member.user.toString()).emit('message_reaction', {
            messageId: message._id,
            reaction: message.reactions[message.reactions.length - 1]
          });
        }
      });
    }

    res.json(message);
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ message: 'Error adding reaction' });
  }
});

// Remove reaction from message
router.delete('/:messageId/reactions', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    message.removeReaction(req.user._id);
    await message.save();

    // Emit socket event
    if (message.recipient) {
      io.to(message.recipient.toString()).emit('message_reaction_removed', {
        messageId: message._id,
        userId: req.user._id
      });
    } else if (message.group) {
      const group = await Group.findById(message.group);
      group.members.forEach(member => {
        if (member.user.toString() !== req.user._id.toString()) {
          io.to(member.user.toString()).emit('message_reaction_removed', {
            messageId: message._id,
            userId: req.user._id
          });
        }
      });
    }

    res.json(message);
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ message: 'Error removing reaction' });
  }
});

// Edit message
router.put('/:messageId', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this message' });
    }

    if (message.group) {
      const group = await Group.findById(message.group);
      if (!group.settings.allowMessageEdit) {
        return res.status(403).json({ message: 'Message editing is not allowed in this group' });
      }
    }

    message.edit(content);
    await message.save();

    // Emit socket event
    if (message.recipient) {
      io.to(message.recipient.toString()).emit('message_edited', message);
    } else if (message.group) {
      const group = await Group.findById(message.group);
      group.members.forEach(member => {
        if (member.user.toString() !== req.user._id.toString()) {
          io.to(member.user.toString()).emit('message_edited', message);
        }
      });
    }

    res.json(message);
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Error editing message' });
  }
});

// Delete message
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    if (message.group) {
      const group = await Group.findById(message.group);
      if (!group.settings.allowMessageDelete) {
        return res.status(403).json({ message: 'Message deletion is not allowed in this group' });
      }
    }

    message.deleteForUser(req.user._id);
    await message.save();

    // Emit socket event
    if (message.recipient) {
      io.to(message.recipient.toString()).emit('message_deleted', {
        messageId: message._id,
        userId: req.user._id
      });
    } else if (message.group) {
      const group = await Group.findById(message.group);
      group.members.forEach(member => {
        if (member.user.toString() !== req.user._id.toString()) {
          io.to(member.user.toString()).emit('message_deleted', {
            messageId: message._id,
            userId: req.user._id
          });
        }
      });
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Error deleting message' });
  }
});

// Archive message
router.post('/:messageId/archive', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    message.archive();
    await message.save();

    res.json(message);
  } catch (error) {
    console.error('Archive message error:', error);
    res.status(500).json({ message: 'Error archiving message' });
  }
});

// Unarchive message
router.post('/:messageId/unarchive', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    message.unarchive();
    await message.save();

    res.json(message);
  } catch (error) {
    console.error('Unarchive message error:', error);
    res.status(500).json({ message: 'Error unarchiving message' });
  }
});

// Get archived messages
router.get('/archived', auth, pagination(), async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id }
      ],
      isArchived: true,
      isDeleted: false,
      'deletedFor.user': { $ne: req.user._id }
    })
      .sort({ createdAt: -1 })
      .skip(req.pagination.skip)
      .limit(req.pagination.limit)
      .populate('sender', 'name avatar')
      .populate('recipient', 'name avatar')
      .populate('group', 'name avatar')
      .populate('reactions.user', 'name avatar');

    res.json(messages);
  } catch (error) {
    console.error('Get archived messages error:', error);
    res.status(500).json({ message: 'Error fetching archived messages' });
  }
});

// Create a new message
router.post('/', [auth, contentFilter], async (req, res) => {
  try {
    const message = new Message({
      ...req.body,
      sender: req.user._id
    });
    await message.save();
    
    // Emit socket event
    io.to(message.recipient.toString()).emit('new_message', message);
    
    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get messages for a chat
router.get('/chat/:userId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user._id }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get messages for a group
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      group: req.params.groupId
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a message
router.put('/:messageId', [auth, contentFilter], async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    Object.assign(message, req.body);
    await message.save();
    
    // Emit socket event
    io.to(message.recipient.toString()).emit('message_updated', message);
    
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a message
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await message.deleteForUser(req.user._id);
    
    // Emit socket event
    io.to(message.recipient.toString()).emit('message_deleted', message._id);
    
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Pin a message
router.post('/:messageId/pin', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    await message.pin(req.user._id);
    
    // Emit socket event
    io.to(message.recipient.toString()).emit('message_pinned', message);
    
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Unpin a message
router.post('/:messageId/unpin', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    await message.unpin();
    
    // Emit socket event
    io.to(message.recipient.toString()).emit('message_unpinned', message);
    
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a thread
router.post('/:messageId/thread', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    await message.createThread();
    
    // Emit socket event
    io.to(message.recipient.toString()).emit('thread_created', message);
    
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get thread messages
router.get('/:messageId/thread', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      'thread.parentMessage': req.params.messageId
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Schedule a message
router.post('/:messageId/schedule', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await message.schedule(new Date(req.body.scheduledTime));
    
    // Emit socket event
    io.to(message.recipient.toString()).emit('message_scheduled', message);
    
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get scheduled messages
router.get('/scheduled', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      sender: req.user._id,
      isScheduled: true,
      scheduledFor: { $gt: new Date() }
    }).sort({ scheduledFor: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 