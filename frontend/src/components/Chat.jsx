import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { format } from 'date-fns';
import { 
  PaperAirplaneIcon, 
  PaperClipIcon, 
  PhoneIcon, 
  VideoCameraIcon,
  XMarkIcon
} from '@heroicons/react/24/solid';

const Chat = () => {
  const { chatId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const { socket } = useSocket();
  const { user } = useAuth();
  const { 
    loading, 
    error, 
    sendMessage: sendChatMessage, 
    loadMoreMessages,
    hasMoreMessages 
  } = useChat();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [typingUsers, setTypingUsers] = useState(new Set());

  useEffect(() => {
    if (!user) return;

    // Fetch users
    const fetchUsers = async () => {
      try {
        const response = await axios.get('/api/users', {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        });
        // Filter out current user
        const filteredUsers = response.data.filter(u => u._id !== user._id);
        setUsers(filteredUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, [user]);

  useEffect(() => {
    if (!socket || !user) return;

    // Socket event listeners
    socket.on('private message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('typing', ({ userId, isTyping }) => {
      if (userId === selectedUser?._id) {
        setIsTyping(isTyping);
      }
    });

    return () => {
      socket.off('private message');
      socket.off('typing');
    };
  }, [socket, user, selectedUser]);

  useEffect(() => {
    if (!selectedUser?._id) return;

    // Fetch message history
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`/api/messages/${selectedUser._id}`, {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        });
        setMessages(response.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [selectedUser, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = () => {
    if (!socket || !selectedUser) return;

    socket.emit('typing', { recipientId: selectedUser._id, isTyping: true });

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    const timeout = setTimeout(() => {
      socket.emit('typing', { recipientId: selectedUser._id, isTyping: false });
    }, 1000);

    setTypingTimeout(timeout);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    try {
      await sendChatMessage(newMessage, selectedFile);
      setNewMessage('');
      setSelectedFile(null);
      setIsTyping(false);
      socket?.emit('stopTyping', { chatId, userId: user._id });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleStartCall = (type) => {
    setIsCallActive(true);
    // Implement call logic here
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    // Implement end call logic here
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  // Handle typing indicator
  useEffect(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      socket?.emit('typing', { chatId, userId: user._id });
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socket?.emit('stopTyping', { chatId, userId: user._id });
      }, 3000);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isTyping, chatId, user._id, socket]);

  // Listen for typing events
  useEffect(() => {
    if (!socket) return;

    const handleTyping = ({ userId, userName }) => {
      if (userId !== user._id) {
        setTypingUsers(prev => new Set([...prev, userName]));
      }
    };

    const handleStopTyping = ({ userId, userName }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userName);
        return newSet;
      });
    };

    socket.on('userTyping', handleTyping);
    socket.on('userStoppedTyping', handleStopTyping);

    return () => {
      socket.off('userTyping', handleTyping);
      socket.off('userStoppedTyping', handleStopTyping);
    };
  }, [socket, user._id]);

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="flex-1 flex items-center justify-center">Loading...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="flex h-full">
      {/* User List Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700">
        <div className="p-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="overflow-y-auto h-[calc(100vh-8rem)]">
          {filteredUsers.map((u) => (
            <div
              key={u._id}
              onClick={() => setSelectedUser(u)}
              className={`p-4 cursor-pointer hover:bg-gray-700 ${
                selectedUser?._id === u._id ? 'bg-gray-700' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                  <span className="text-white text-lg">
                    {u.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-white font-medium">{u.username}</p>
                  <p className="text-gray-400 text-sm">Click to chat</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="bg-gray-800 p-4">
              <h2 className="text-white text-lg font-semibold">{selectedUser.username}</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {hasMoreMessages && (
                <button
                  onClick={loadMoreMessages}
                  className="w-full py-2 text-sm text-blue-500 hover:text-blue-600"
                >
                  Load more messages
                </button>
              )}
              
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`flex ${message.sender === user._id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.sender === user._id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {message.type === 'text' && <p>{message.content}</p>}
                    {message.type === 'image' && (
                      <img
                        src={message.fileUrl}
                        alt="Shared image"
                        className="max-w-full rounded-lg"
                      />
                    )}
                    {message.type === 'video' && (
                      <video
                        src={message.fileUrl}
                        controls
                        className="max-w-full rounded-lg"
                      />
                    )}
                    {message.type === 'audio' && (
                      <audio src={message.fileUrl} controls />
                    )}
                    {message.type === 'document' && (
                      <a
                        href={message.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 text-blue-500 hover:text-blue-600"
                      >
                        <PaperClipIcon className="w-4 h-4" />
                        <span>{message.fileName}</span>
                      </a>
                    )}
                    <span className="text-xs opacity-75 mt-1 block">
                      {format(new Date(message.createdAt), 'HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
              
              {typingUsers.size > 0 && (
                <div className="text-sm text-gray-500 italic">
                  {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t">
              {selectedFile && (
                <div className="mb-2 p-2 bg-gray-100 rounded-lg flex items-center justify-between">
                  <span className="text-sm truncate">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={removeSelectedFile}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                />
                
                <button
                  type="button"
                  onClick={handleFileUpload}
                  className="p-2 rounded-full hover:bg-gray-100"
                  title="Attach file"
                >
                  <PaperClipIcon className="w-5 h-5 text-gray-600" />
                </button>
                
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    if (!isTyping) setIsTyping(true);
                  }}
                  placeholder="Type a message..."
                  className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                <button
                  type="submit"
                  disabled={!newMessage.trim() && !selectedFile}
                  className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Select a user to start chatting</p>
          </div>
        )}
      </div>

      {/* Call interface */}
      {isCallActive && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Call in progress</h3>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleEndCall}
                className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600"
              >
                <PhoneIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat; 