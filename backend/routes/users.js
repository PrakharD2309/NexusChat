const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all users (except current user)
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('-password')
      .sort({ name: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (email) user.email = email;
    if (avatar) user.avatar = avatar;

    await user.save();
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Update user status
router.put('/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findById(req.user._id);
    user.status = status;
    await user.save();
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating status' });
  }
});

// Search users
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error searching users' });
  }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 