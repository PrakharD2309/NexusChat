import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  useEffect(() => {
    console.log('PrivateRoute state:', { user, loading, path: location.pathname });
  }, [user, loading, location]);

  if (loading) {
    console.log('PrivateRoute: Loading state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!user) {
    console.log('PrivateRoute: No user, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  console.log('PrivateRoute: Rendering protected content');
  return children;
};

export default PrivateRoute; 