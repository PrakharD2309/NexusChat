import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { formatDistanceToNow } from 'date-fns';

const Group = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchGroup();
    fetchMessages();

    if (socket) {
      socket.on('new_message', handleNewMessage);
      socket.on('group_updated', handleGroupUpdate);
    }

    return () => {
      if (socket) {
        socket.off('new_message');
        socket.off('group_updated');
      }
    };
  }, [id, socket]);

  const fetchGroup = async () => {
    try {
      const response = await axios.get(`/api/groups/${id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      setGroup(response.data);
      setGroupName(response.data.name);
      setGroupDescription(response.data.description || '');
      setIsPrivate(response.data.settings.isPrivate);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching group:', error);
      setError('Failed to load group');
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`/api/messages/group/${id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleNewMessage = (message) => {
    if (message.group === id) {
      setMessages(prev => [...prev, message]);
    }
  };

  const handleGroupUpdate = (updatedGroup) => {
    if (updatedGroup._id === id) {
      setGroup(updatedGroup);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const formData = new FormData();
      formData.append('content', newMessage);
      formData.append('type', 'text');
      formData.append('group', id);

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const response = await axios.post('/api/messages', formData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
      setSelectedFile(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const updateGroup = async () => {
    try {
      const formData = new FormData();
      formData.append('name', groupName);
      formData.append('description', groupDescription);
      formData.append('isPrivate', isPrivate);

      if (selectedFile) {
        formData.append('avatar', selectedFile);
      }

      const response = await axios.put(`/api/groups/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setGroup(response.data);
      setEditingGroup(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error updating group:', error);
    }
  };

  const leaveGroup = async () => {
    if (window.confirm('Are you sure you want to leave this group?')) {
      try {
        await axios.post(`/api/groups/${id}/leave`, {}, {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        });
        navigate('/groups');
      } catch (error) {
        console.error('Error leaving group:', error);
      }
    }
  };

  const deleteGroup = async () => {
    if (window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      try {
        await axios.delete(`/api/groups/${id}`, {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        });
        navigate('/groups');
      } catch (error) {
        console.error('Error deleting group:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        {error}
      </div>
    );
  }

  const isAdmin = group.admins.includes(user._id);
  const isCreator = group.creator === user._id;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img
              src={group.avatar || '/default-group.png'}
              alt={group.name}
              className="w-12 h-12 rounded-full"
            />
            <div>
              {editingGroup ? (
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="border rounded px-2 py-1"
                />
              ) : (
                <h1 className="text-xl font-semibold">{group.name}</h1>
              )}
              <p className="text-sm text-gray-500">
                {group.members.length} members
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div
            key={message._id}
            className={`flex ${
              message.sender._id === user._id ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md rounded-lg p-3 ${
                message.sender._id === user._id
                  ? 'bg-blue-500 text-white'
                  : 'bg-white'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <img
                  src={message.sender.avatar || '/default-avatar.png'}
                  alt={message.sender.name}
                  className="w-6 h-6 rounded-full"
                />
                <span className="font-medium">{message.sender.name}</span>
              </div>
              {message.type === 'text' ? (
                <p>{message.content}</p>
              ) : (
                <div>
                  {message.type === 'image' && (
                    <img
                      src={message.fileUrl}
                      alt="Shared image"
                      className="max-w-full rounded"
                    />
                  )}
                  {message.type === 'file' && (
                    <a
                      href={message.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-blue-500 hover:text-blue-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span>{message.fileName}</span>
                    </a>
                  )}
                </div>
              )}
              <span className="text-xs opacity-75">
                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="bg-white p-4 border-t">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:border-blue-500"
          />
          <label className="p-2 hover:bg-gray-100 rounded-full cursor-pointer">
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </label>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600"
          >
            Send
          </button>
        </div>
        {selectedFile && (
          <div className="mt-2 flex items-center space-x-2">
            <span className="text-sm text-gray-500">{selectedFile.name}</span>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="text-red-500 hover:text-red-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </form>

      {/* Members Sidebar */}
      {showMembers && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Members</h2>
              <button
                onClick={() => setShowMembers(false)}
                className="text-gray-500 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="p-4 overflow-y-auto">
            {group.members.map(member => (
              <div key={member.user._id} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <img
                    src={member.user.avatar || '/default-avatar.png'}
                    alt={member.user.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-medium">{member.user.name}</p>
                    <p className="text-sm text-gray-500">{member.role}</p>
                  </div>
                </div>
                {isAdmin && member.user._id !== user._id && (
                  <div className="flex items-center space-x-2">
                    {member.role === 'member' ? (
                      <button
                        onClick={() => makeAdmin(member.user._id)}
                        className="text-blue-500 hover:text-blue-600"
                      >
                        Make Admin
                      </button>
                    ) : (
                      <button
                        onClick={() => removeAdmin(member.user._id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        Remove Admin
                      </button>
                    )}
                    <button
                      onClick={() => removeMember(member.user._id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Sidebar */}
      {showSettings && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Group Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="p-4 space-y-4">
            {editingGroup ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Group Name</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="mt-1 block w-full border rounded-md shadow-sm p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    className="mt-1 block w-full border rounded-md shadow-sm p-2"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Group Avatar</label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="mt-1 block w-full"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <label className="ml-2 block text-sm text-gray-700">Private Group</label>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={updateGroup}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingGroup(false)}
                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Group Name</h3>
                  <p className="mt-1">{group.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Description</h3>
                  <p className="mt-1">{group.description || 'No description'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Privacy</h3>
                  <p className="mt-1">{group.settings.isPrivate ? 'Private' : 'Public'}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingGroup(true)}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Edit Group
                  </button>
                  {isCreator ? (
                    <button
                      onClick={deleteGroup}
                      className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                      Delete Group
                    </button>
                  ) : (
                    <button
                      onClick={leaveGroup}
                      className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                      Leave Group
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Group; 