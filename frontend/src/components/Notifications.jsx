import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const { socket } = useSocket();
  const { user } = useAuth();
  const audioRef = useRef(new Audio('/notification.mp3'));

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (message.sender._id === user._id) return;
      addNotification({
        type: 'message',
        title: 'New Message',
        message: `${message.sender.name}: ${message.content}`,
        timestamp: new Date(),
        read: false
      });
    };

    const handleNewCall = (call) => {
      addNotification({
        type: 'call',
        title: 'Incoming Call',
        message: `${call.caller.name} is calling you`,
        timestamp: new Date(),
        read: false
      });
    };

    const handleCallEnded = (call) => {
      addNotification({
        type: 'call_ended',
        title: 'Call Ended',
        message: `Call with ${call.caller.name} has ended`,
        timestamp: new Date(),
        read: false
      });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('incoming_call', handleNewCall);
    socket.on('call_ended', handleCallEnded);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('incoming_call', handleNewCall);
      socket.off('call_ended', handleCallEnded);
    };
  }, [socket, user]);

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50));
    playNotificationSound();
  };

  const playNotificationSound = () => {
    audioRef.current.play().catch(error => {
      console.error('Error playing notification sound:', error);
    });
  };

  const markAsRead = (index) => {
    setNotifications(prev =>
      prev.map((notification, i) =>
        i === index ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white focus:outline-none"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Notifications</h3>
              <div className="flex space-x-2">
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Mark all as read
                </button>
                <button
                  onClick={clearNotifications}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Clear all
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                No notifications
              </div>
            ) : (
              notifications.map((notification, index) => (
                <div
                  key={index}
                  className={`p-4 border-b border-gray-700 ${
                    !notification.read ? 'bg-gray-700' : ''
                  }`}
                  onClick={() => markAsRead(index)}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {notification.type === 'message' && (
                        <svg
                          className="w-6 h-6 text-blue-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                          />
                        </svg>
                      )}
                      {notification.type === 'call' && (
                        <svg
                          className="w-6 h-6 text-green-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-white">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-400">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications; 