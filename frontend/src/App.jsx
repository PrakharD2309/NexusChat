import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';
import VideoCall from './components/VideoCall';
import Profile from './components/Profile';
import { useAuth } from './context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <div className="min-h-screen bg-gray-100">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <div className="container mx-auto p-4">
                      <h1 className="text-2xl font-bold mb-4">Chat App</h1>
                      <Chat />
                    </div>
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />
              <Route
                path="/video-call/:roomId"
                element={
                  <PrivateRoute>
                    <VideoCall />
                  </PrivateRoute>
                }
              />
            </Routes>
          </div>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
