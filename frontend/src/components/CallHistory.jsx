import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from './LoadingSpinner';

const CallHistory = () => {
  const { user } = useAuth();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, missed, completed, rejected
  const [stats, setStats] = useState({
    total: 0,
    missed: 0,
    completed: 0,
    rejected: 0,
    totalDuration: 0
  });

  useEffect(() => {
    fetchCallHistory();
    fetchCallStats();
  }, []);

  const fetchCallHistory = async () => {
    try {
      const response = await axios.get('/api/call-history', {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      setCalls(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching call history:', error);
      setError('Failed to load call history');
      setLoading(false);
    }
  };

  const fetchCallStats = async () => {
    try {
      const response = await axios.get('/api/call-history/stats/summary');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching call stats:', error);
    }
  };

  const deleteCall = async (callId) => {
    try {
      await axios.delete(`/api/call-history/${callId}`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      setCalls(calls.filter(call => call._id !== callId));
    } catch (error) {
      console.error('Error deleting call:', error);
      setError('Failed to delete call');
    }
  };

  const filteredCalls = calls.filter(call => {
    if (filter === 'all') return true;
    return call.status === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'missed':
        return 'text-red-500';
      case 'rejected':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <LoadingSpinner size="large" />;
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Call History</h2>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-gray-400 text-sm">Total Calls</h3>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-gray-400 text-sm">Completed</h3>
          <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-gray-400 text-sm">Missed</h3>
          <p className="text-2xl font-bold text-red-500">{stats.missed}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-gray-400 text-sm">Total Duration</h3>
          <p className="text-2xl font-bold text-white">{formatDuration(stats.totalDuration)}</p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setFilter('missed')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'missed' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          Missed
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'rejected' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          Rejected
        </button>
      </div>

      {/* Call List */}
      <div className="space-y-4">
        {filteredCalls.map((call) => (
          <div
            key={call._id}
            className="bg-gray-800 p-4 rounded-lg flex items-center justify-between"
          >
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src={call.caller.avatar || `https://ui-avatars.com/api/?name=${call.caller.name}`}
                  alt={call.caller.name}
                  className="w-12 h-12 rounded-full"
                />
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${
                    call.type === 'video' ? 'bg-blue-500' : 'bg-green-500'
                  }`}
                ></span>
              </div>
              <div>
                <h3 className="text-white font-medium">{call.caller.name}</h3>
                <p className="text-gray-400 text-sm">
                  {formatDistanceToNow(new Date(call.startTime), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-medium ${getStatusColor(call.status)}`}>
                {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
              </p>
              <p className="text-gray-400 text-sm">
                {call.duration ? formatDuration(call.duration) : 'N/A'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => deleteCall(call._id)}
                className="text-gray-400 hover:text-red-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {filteredCalls.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No calls found
          </div>
        )}
      </div>
    </div>
  );
};

export default CallHistory; 