import React from 'react';

const LoadingSpinner = ({ size = 'medium', color = 'blue', fullScreen = false }) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  const colorClasses = {
    blue: 'border-blue-500',
    white: 'border-white',
    gray: 'border-gray-500'
  };

  const spinner = (
    <div className={`animate-spin rounded-full border-2 border-t-transparent ${sizeClasses[size]} ${colorClasses[color]}`}></div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      {spinner}
    </div>
  );
};

export default LoadingSpinner; 