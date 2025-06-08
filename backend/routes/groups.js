const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const User = require('../models/User');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Create a new group
router.post('/', auth, upload.single('avatar'), async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    
    const group = new Group({
      name,
      description,
      creator: req.user._id,
      admins: [req.user._id],
      members: [{ user: req.user._id, role: 'admin' }],
      settings: {
        isPrivate: isPrivate === 'true'
      }
    });

    if (req.file) {
      group.avatar = req.file.path;
    }

    await group.save();
    await group.populate('members.user', 'name avatar');
    
    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Error creating group' });
  }
});

// Get all groups for a user
router.get('/', auth, async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.user._id
    })
    .populate('members.user', 'name avatar')
    .populate('lastMessage')
    .sort({ lastActivity: -1 });

    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Error fetching groups' });
  }
});

// Get a specific group
router.get('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members.user', 'name avatar')
      .populate('lastMessage');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member
    const isMember = group.members.some(member => 
      member.user._id.toString() === req.user._id.toString()
    );

    if (!isMember && group.settings.isPrivate) {
      return res.status(403).json({ message: 'Not authorized to view this group' });
    }

    res.json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ message: 'Error fetching group' });
  }
});

// Update group
router.put('/:id', auth, upload.single('avatar'), async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is admin
    const isAdmin = group.admins.includes(req.user._id);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update group' });
    }

    const { name, description, isPrivate } = req.body;
    
    if (name) group.name = name;
    if (description) group.description = description;
    if (isPrivate !== undefined) group.settings.isPrivate = isPrivate === 'true';
    if (req.file) group.avatar = req.file.path;

    await group.save();
    await group.populate('members.user', 'name avatar');
    
    res.json(group);
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ message: 'Error updating group' });
  }
});

// Add member to group
router.post('/:id/members', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is admin
    const isAdmin = group.admins.includes(req.user._id);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Not authorized to add members' });
    }

    // Check if user is already a member
    const isMember = group.members.some(member => 
      member.user.toString() === userId
    );

    if (isMember) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    group.members.push({ user: userId });
    await group.save();
    await group.populate('members.user', 'name avatar');
    
    res.json(group);
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ message: 'Error adding member' });
  }
});

// Remove member from group
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is admin
    const isAdmin = group.admins.includes(req.user._id);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Not authorized to remove members' });
    }

    // Cannot remove the creator
    if (req.params.userId === group.creator.toString()) {
      return res.status(400).json({ message: 'Cannot remove group creator' });
    }

    group.members = group.members.filter(member => 
      member.user.toString() !== req.params.userId
    );

    // Remove from admins if they were an admin
    group.admins = group.admins.filter(admin => 
      admin.toString() !== req.params.userId
    );

    await group.save();
    await group.populate('members.user', 'name avatar');
    
    res.json(group);
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ message: 'Error removing member' });
  }
});

// Make member admin
router.post('/:id/admins/:userId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is admin
    const isAdmin = group.admins.includes(req.user._id);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Not authorized to make admins' });
    }

    // Check if user is a member
    const member = group.members.find(m => 
      m.user.toString() === req.params.userId
    );

    if (!member) {
      return res.status(404).json({ message: 'User is not a member' });
    }

    // Add to admins if not already
    if (!group.admins.includes(req.params.userId)) {
      group.admins.push(req.params.userId);
      member.role = 'admin';
      await group.save();
    }

    await group.populate('members.user', 'name avatar');
    res.json(group);
  } catch (error) {
    console.error('Error making admin:', error);
    res.status(500).json({ message: 'Error making admin' });
  }
});

// Remove admin
router.delete('/:id/admins/:userId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is admin
    const isAdmin = group.admins.includes(req.user._id);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Not authorized to remove admins' });
    }

    // Cannot remove the creator
    if (req.params.userId === group.creator.toString()) {
      return res.status(400).json({ message: 'Cannot remove group creator' });
    }

    // Remove from admins
    group.admins = group.admins.filter(admin => 
      admin.toString() !== req.params.userId
    );

    // Update member role
    const member = group.members.find(m => 
      m.user.toString() === req.params.userId
    );
    if (member) {
      member.role = 'member';
    }

    await group.save();
    await group.populate('members.user', 'name avatar');
    
    res.json(group);
  } catch (error) {
    console.error('Error removing admin:', error);
    res.status(500).json({ message: 'Error removing admin' });
  }
});

// Leave group
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Cannot leave if you're the creator
    if (req.user._id.toString() === group.creator.toString()) {
      return res.status(400).json({ message: 'Group creator cannot leave' });
    }

    // Remove from members
    group.members = group.members.filter(member => 
      member.user.toString() !== req.user._id.toString()
    );

    // Remove from admins if they were an admin
    group.admins = group.admins.filter(admin => 
      admin.toString() !== req.user._id.toString()
    );

    await group.save();
    res.json({ message: 'Successfully left group' });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ message: 'Error leaving group' });
  }
});

// Delete group
router.delete('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Only creator can delete
    if (req.user._id.toString() !== group.creator.toString()) {
      return res.status(403).json({ message: 'Only group creator can delete the group' });
    }

    await group.remove();
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ message: 'Error deleting group' });
  }
});

module.exports = router; 