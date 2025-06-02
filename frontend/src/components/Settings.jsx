import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    notifications: true,
    soundEnabled: true,
    theme: 'dark',
    language: 'en',
    autoReply: false,
    autoReplyMessage: '',
    status: 'online'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/users/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.put('/api/users/settings', settings);
      setMessage({ type: 'success', text: 'Settings updated successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating settings' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>

      {message.text && (
        <div
          className={`p-4 mb-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-white font-medium">Notifications</label>
            <p className="text-gray-400 text-sm">Receive notifications for new messages</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="notifications"
              checked={settings.notifications}
              onChange={handleChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Sound */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-white font-medium">Sound</label>
            <p className="text-gray-400 text-sm">Enable sound for notifications</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="soundEnabled"
              checked={settings.soundEnabled}
              onChange={handleChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Theme */}
        <div>
          <label className="block text-white font-medium mb-2">Theme</label>
          <select
            name="theme"
            value={settings.theme}
            onChange={handleChange}
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </div>

        {/* Language */}
        <div>
          <label className="block text-white font-medium mb-2">Language</label>
          <select
            name="language"
            value={settings.language}
            onChange={handleChange}
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>

        {/* Auto Reply */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">Auto Reply</label>
              <p className="text-gray-400 text-sm">Enable automatic replies when away</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="autoReply"
                checked={settings.autoReply}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {settings.autoReply && (
            <div>
              <label className="block text-white font-medium mb-2">Auto Reply Message</label>
              <textarea
                name="autoReplyMessage"
                value={settings.autoReplyMessage}
                onChange={handleChange}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Enter your auto reply message..."
              ></textarea>
            </div>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="block text-white font-medium mb-2">Default Status</label>
          <select
            name="status"
            value={settings.status}
            onChange={handleChange}
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="online">Online</option>
            <option value="away">Away</option>
            <option value="busy">Busy</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
};

export default Settings; 