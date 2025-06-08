import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Configure axios defaults
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  family: 4 // Force IPv4
});

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('Initial token check:', token ? 'Token exists' : 'No token');
    if (token) {
      checkAuth(token);
    } else {
      setLoading(false);
    }
  }, []);

  const checkAuth = async (token) => {
    try {
      console.log('Checking auth with token:', token.substring(0, 10) + '...');
      const response = await api.get('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Auth check response:', response.data);
      setUser({ ...response.data, token });
    } catch (error) {
      console.error('Auth check failed:', error.response?.data || error.message);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('Attempting login for:', email);
      setLoading(true);
      const response = await api.post('/api/auth/login', {
        email,
        password
      });
      console.log('Login response:', response.data);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser({ ...user, token });
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      console.log('Attempting registration:', userData);
      setLoading(true);
      const response = await api.post('/api/auth/register', userData);
      console.log('Registration response:', response.data);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser({ ...user, token });
      return { success: true };
    } catch (error) {
      console.error('Registration failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('Logging out user');
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    try {
      console.log('Updating profile:', profileData);
      setLoading(true);
      const response = await api.put('/api/users/profile', profileData, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      console.log('Profile update response:', response.data);
      setUser({ ...user, ...response.data });
      return { success: true };
    } catch (error) {
      console.error('Profile update failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Profile update failed');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 