const socketIO = require('socket.io');
let io;

// Initialize socket.io
function initialize(server) {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Connection handling
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

  return io;
}

// Set io instance
function setIO(ioInstance) {
  io = ioInstance;
}

// Emit to specific user
function emitToUser(userId, event, data) {
  if (!io) {
    console.error('Socket.io not initialized');
    return;
  }
  io.to(userId.toString()).emit(event, data);
}

// Emit to multiple users
function emitToUsers(userIds, event, data) {
  if (!io) {
    console.error('Socket.io not initialized');
    return;
  }
  userIds.forEach(userId => {
    io.to(userId.toString()).emit(event, data);
  });
}

// Emit to all users
function emitToAll(event, data) {
  if (!io) {
    console.error('Socket.io not initialized');
    return;
  }
  io.emit(event, data);
}

// Emit to room
function emitToRoom(roomId, event, data) {
  if (!io) {
    console.error('Socket.io not initialized');
    return;
  }
  io.to(roomId.toString()).emit(event, data);
}

// Get connected users count
function getConnectedUsersCount() {
  if (!io) {
    console.error('Socket.io not initialized');
    return 0;
  }
  return io.engine.clientsCount;
}

// Get socket instance
function getIO() {
  if (!io) {
    console.error('Socket.io not initialized');
    return null;
  }
  return io;
}

module.exports = {
  initialize,
  setIO,
  emitToUser,
  emitToUsers,
  emitToAll,
  emitToRoom,
  getConnectedUsersCount,
  getIO
}; 