require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const fs = require('fs');
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
const socketService = require('./services/socketService');
const fileCleanupService = require('./services/fileCleanupService');

// Validate environment variables
validateEnv();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const server = http.createServer(app);

// Initialize socket.io
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Set io instance in socket service
socketService.setIO(io);

// Make io accessible to routes
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user's room
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  // Leave user's room
  socket.on('leave', (userId) => {
    socket.leave(userId);
    console.log(`User ${userId} left their room`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

// Body parser middleware
app.use(express.json({ 
  strict: false,
  limit: '10mb'
}));
app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb'
}));

// Debug middleware to log request bodies
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request body:', req.body);
  }
  next();
});

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
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    // Start file cleanup service
    fileCleanupService.start();
    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
}); 