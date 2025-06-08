const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message');
const presenceService = require('./services/presence');
const webrtcService = require('./services/webrtc');

let io;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.user._id);

    // Join user's room for direct messages
    socket.join(socket.user._id.toString());

    // Handle joining a call room
    socket.on('join-room', ({ roomId, userId }) => {
      socket.join(roomId);
      socket.to(roomId).emit('user-joined', { userId: socket.user._id });
    });

    // Handle leaving a call room
    socket.on('leave-room', ({ roomId, userId }) => {
      socket.leave(roomId);
      socket.to(roomId).emit('user-left', { userId: socket.user._id });
    });

    // Handle WebRTC signaling
    socket.on('offer', ({ roomId, offer, to }) => {
      socket.to(roomId).emit('offer', {
        offer,
        from: socket.user._id
      });
    });

    socket.on('answer', ({ roomId, answer, to }) => {
      socket.to(roomId).emit('answer', {
        answer,
        from: socket.user._id
      });
    });

    socket.on('ice-candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('ice-candidate', {
        candidate,
        from: socket.user._id
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.user._id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIO
}; 