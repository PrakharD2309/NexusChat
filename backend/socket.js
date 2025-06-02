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
      methods: ['GET', 'POST']
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

  io.on('connection', async (socket) => {
    console.log('User connected:', socket.user.name);

    // Handle user presence
    const onlineUsers = await presenceService.userConnected(socket.user._id, socket.id);
    io.emit('user_status_change', onlineUsers);

    // Handle user status updates
    socket.on('update_status', async (status) => {
      await presenceService.updateUserStatus(socket.user._id, status);
      io.emit('user_status_change', presenceService.getOnlineUsers());
    });

    // Handle typing status
    socket.on('typing', ({ recipientId, isTyping }) => {
      const recipientSocketId = presenceService.getUserSocketId(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('user_typing', {
          userId: socket.user._id,
          isTyping
        });
      }
    });

    // Handle new messages
    socket.on('send_message', async (data) => {
      try {
        const message = new Message({
          sender: socket.user._id,
          recipient: data.recipientId,
          content: data.content,
          type: data.type || 'text'
        });

        await message.save();

        const recipientSocketId = presenceService.getUserSocketId(data.recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('new_message', {
            ...message.toJSON(),
            sender: socket.user
          });
        }

        socket.emit('message_sent', message);
      } catch (error) {
        socket.emit('error', { message: 'Error sending message' });
      }
    });

    // Handle message read status
    socket.on('message_read', async ({ messageId }) => {
      try {
        const message = await Message.findById(messageId);
        if (message && message.recipient.toString() === socket.user._id.toString()) {
          message.status = 'read';
          message.readAt = new Date();
          await message.save();

          const senderSocketId = presenceService.getUserSocketId(message.sender.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit('message_status_update', {
              messageId,
              status: 'read',
              readAt: message.readAt
            });
          }
        }
      } catch (error) {
        socket.emit('error', { message: 'Error updating message status' });
      }
    });

    // Handle video call signaling
    socket.on('call_user', ({ recipientId, signalData }) => {
      if (webrtcService.isUserInCall(socket.user._id)) {
        socket.emit('error', { message: 'You are already in a call' });
        return;
      }

      const recipientSocketId = presenceService.getUserSocketId(recipientId);
      if (!recipientSocketId) {
        socket.emit('error', { message: 'User is not online' });
        return;
      }

      if (webrtcService.isUserInCall(recipientId)) {
        socket.emit('error', { message: 'User is in another call' });
        return;
      }

      const callId = webrtcService.handleCallRequest(
        socket.user._id,
        recipientId,
        signalData
      );

      io.to(recipientSocketId).emit('incoming_call', {
        callId,
        caller: socket.user,
        signalData
      });
    });

    socket.on('answer_call', ({ callId, signalData }) => {
      const call = webrtcService.handleCallAccept(callId, signalData);
      if (!call) {
        socket.emit('error', { message: 'Call not found' });
        return;
      }

      const callerSocketId = presenceService.getUserSocketId(call.callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit('call_accepted', {
          callId,
          recipient: socket.user,
          signalData
        });
      }
    });

    socket.on('reject_call', ({ callId }) => {
      const call = webrtcService.handleCallReject(callId);
      if (!call) {
        socket.emit('error', { message: 'Call not found' });
        return;
      }

      const callerSocketId = presenceService.getUserSocketId(call.callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit('call_rejected', {
          callId,
          recipient: socket.user
        });
      }
    });

    socket.on('end_call', ({ callId }) => {
      const call = webrtcService.handleCallEnd(callId);
      if (!call) {
        socket.emit('error', { message: 'Call not found' });
        return;
      }

      const otherUserId = call.callerId === socket.user._id ? call.recipientId : call.callerId;
      const otherUserSocketId = presenceService.getUserSocketId(otherUserId);
      
      if (otherUserSocketId) {
        io.to(otherUserSocketId).emit('call_ended', {
          callId,
          user: socket.user
        });
      }

      webrtcService.cleanupCall(callId);
    });

    socket.on('ice_candidate', ({ callId, candidate }) => {
      webrtcService.addIceCandidate(callId, socket.user._id, candidate);
      
      const call = webrtcService.getActiveCall(callId);
      if (!call) return;

      const otherUserId = call.callerId === socket.user._id ? call.recipientId : call.callerId;
      const otherUserSocketId = presenceService.getUserSocketId(otherUserId);
      
      if (otherUserSocketId) {
        io.to(otherUserSocketId).emit('ice_candidate', {
          callId,
          candidate
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.user.name);
      
      // End any active calls
      const activeCalls = webrtcService.getActiveCallsByUser(socket.user._id);
      for (const call of activeCalls) {
        if (call.status === 'active') {
          const otherUserId = call.callerId === socket.user._id ? call.recipientId : call.callerId;
          const otherUserSocketId = presenceService.getUserSocketId(otherUserId);
          
          if (otherUserSocketId) {
            io.to(otherUserSocketId).emit('call_ended', {
              callId: call.callId,
              user: socket.user
            });
          }
          
          webrtcService.cleanupCall(call.callId);
        }
      }

      const onlineUsers = await presenceService.userDisconnected(socket.user._id);
      io.emit('user_status_change', onlineUsers);
    });
  });

  return io;
};

module.exports = {
  initializeSocket,
  getIO: () => io
}; 