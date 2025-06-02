import React from 'react';
import { formatDistanceToNow } from 'date-fns';

const MessageReadReceipts = ({ message, isOwnMessage }) => {
  if (!isOwnMessage) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return (
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case 'delivered':
        return (
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case 'read':
        return (
          <svg
            className="w-4 h-4 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusText = (status, timestamp) => {
    if (!timestamp) return null;

    switch (status) {
      case 'sent':
        return `Sent ${formatDistanceToNow(new Date(timestamp), { addSuffix: true })}`;
      case 'delivered':
        return `Delivered ${formatDistanceToNow(new Date(timestamp), { addSuffix: true })}`;
      case 'read':
        return `Read ${formatDistanceToNow(new Date(timestamp), { addSuffix: true })}`;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center space-x-1 mt-1">
      {getStatusIcon(message.status)}
      <span className="text-xs text-gray-400">
        {getStatusText(message.status, message.statusTimestamp)}
      </span>
    </div>
  );
};

export default MessageReadReceipts; 