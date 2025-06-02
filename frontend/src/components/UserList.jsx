import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const UserList = ({ onSelectUser, selectedUserId }) => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim()) {
      try {
        const response = await axios.get(`/api/users/search?query=${query}`);
        setUsers(response.data);
      } catch (error) {
        console.error('Error searching users:', error);
      }
    } else {
      fetchUsers();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search users..."
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {users.map((user) => (
          <div
            key={user._id}
            onClick={() => onSelectUser(user)}
            className={`p-4 cursor-pointer hover:bg-gray-700 transition-colors ${
              selectedUserId === user._id ? 'bg-gray-700' : ''
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`}
                  alt={user.name}
                  className="w-12 h-12 rounded-full"
                />
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${
                    user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                  }`}
                ></span>
              </div>
              <div>
                <h3 className="text-white font-medium">{user.name}</h3>
                <p className="text-gray-400 text-sm">
                  {user.status === 'online' ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserList; 