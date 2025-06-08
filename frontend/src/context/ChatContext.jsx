import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import axios from 'axios';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { chatId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [page, setPage] = useState(1);
  const messagesPerPage = 20;

  // Load messages
  useEffect(() => {
    if (!chatId || !user) return;

    const loadMessages = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/messages/${chatId}`, {
          params: {
            page,
            limit: messagesPerPage
          },
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        });

        if (page === 1) {
          setMessages(response.data.messages);
        } else {
          setMessages(prev => [...response.data.messages, ...prev]);
        }

        setHasMoreMessages(response.data.messages.length === messagesPerPage);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Error loading messages');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [chatId, user, page]);

  // Listen for new messages
  useEffect(() => {
    if (!socket || !chatId) return;

    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };

    socket.on('new message', handleNewMessage);

    return () => {
      socket.off('new message', handleNewMessage);
    };
  }, [socket, chatId]);

  // Send message
  const sendMessage = async (content, file = null) => {
    if (!chatId || !user) return;

    try {
      const formData = new FormData();
      if (content) formData.append('content', content);
      if (file) formData.append('file', file);

      const response = await axios.post(`/api/messages/${chatId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}`
        }
      });

      const message = response.data;
      setMessages(prev => [...prev, message]);

      // Emit message through socket
      socket?.emit('send message', {
        chatId,
        message
      });

      return message;
    } catch (err) {
      setError(err.response?.data?.message || 'Error sending message');
      throw err;
    }
  };

  // Load more messages
  const loadMoreMessages = () => {
    if (!hasMoreMessages || loading) return;
    setPage(prev => prev + 1);
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    if (!chatId || !user) return;

    try {
      await axios.post(`/api/messages/${chatId}/read`, null, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });

      // Update messages to mark them as read
      setMessages(prev =>
        prev.map(msg =>
          msg.sender !== user._id && !msg.read
            ? { ...msg, read: true }
            : msg
        )
      );
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    if (!chatId || !user) return;

    try {
      await axios.delete(`/api/messages/${messageId}`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });

      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    } catch (err) {
      setError(err.response?.data?.message || 'Error deleting message');
      throw err;
    }
  };

  const value = {
    messages,
    loading,
    error,
    sendMessage,
    loadMoreMessages,
    hasMoreMessages,
    markMessagesAsRead,
    deleteMessage
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export default ChatContext; 