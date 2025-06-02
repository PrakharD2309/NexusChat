import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      checkAuth(token);
    } else {
      setLoading(false);
    }
  }, []);

  const checkAuth = async (token) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUser({ ...response.data, token });
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        email,
        password
      });
      const { token, ...userData } = response.data;
      localStorage.setItem('token', token);
      setUser({ ...userData, token });
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, userData);
      const { token, ...user } = response.data;
      localStorage.setItem('token', token);
      setUser({ ...user, token });
      return { success: true };
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/users/profile`,
        profileData,
        {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      );
      setUser({ ...user, ...response.data });
      return { success: true };
    } catch (error) {
      console.error('Profile update failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Profile update failed'
      };
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
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 