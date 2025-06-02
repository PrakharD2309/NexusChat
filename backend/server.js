const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const validateEnv = require('./config/validateEnv');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const groupRoutes = require('./routes/groups');
const callHistoryRoutes = require('./routes/callHistory');
const callScheduleRoutes = require('./routes/callSchedule');
const searchRoutes = require('./routes/search');
const userActivityRoutes = require('./routes/userActivity');
const backupRoutes = require('./routes/backup');
const analyticsRoutes = require('./routes/analytics');
const mobileRoutes = require('./routes/mobile');
const cloudBackupRoutes = require('./routes/cloudBackup');
const reactionRoutes = require('./routes/reactions');
const threadRoutes = require('./routes/threads');
const forwardRoutes = require('./routes/forward');
const { setupSocketHandlers } = require('./socket');
const fileCleanupService = require('./services/fileCleanup');

// Validate environment variables
validateEnv();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/call-history', callHistoryRoutes);
app.use('/api/call-schedule', callScheduleRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/activity', userActivityRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/cloud-backup', cloudBackupRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/api/threads', threadRoutes);
app.use('/api/forward', forwardRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    // Start file cleanup service
    fileCleanupService.start();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Setup Socket.IO
app.set('io', io);
setupSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
}); 