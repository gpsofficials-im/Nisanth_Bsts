import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config';


const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Attempt local storage restoration + backend session verification
    const savedUser = localStorage.getItem('nisanth_user');
    const savedToken = localStorage.getItem('nisanth_token');
    
    if (savedToken) {
      // Call backend verification
      fetch(`${API_URL}/api/auth/verify`, {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      })
      .then(res => {
        if (!res.ok) throw new Error('Session expired');
        return res.json();
      })
      .then(data => {
        if (data.success && data.user) {
          setUser(data.user);
          setToken(savedToken);
          localStorage.setItem('nisanth_user', JSON.stringify(data.user));
        }
        setLoading(false);
      })
      .catch(err => {
        console.warn('[AuthContext] Verification failed, clearing session:', err.message);
        // Clear session since it's invalid/expired
        localStorage.removeItem('nisanth_user');
        localStorage.removeItem('nisanth_token');
        setUser(null);
        setToken(null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (loginData) => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.otpRequired) {
        return { success: true, otpRequired: true, tempToken: data.tempToken };
      }
    } catch (err) {
      setError(err.message || 'Server connection error');
      throw err;
    }
  };

  const sendOtp = async (loginData) => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      return { success: true, otpRequired: true, tempToken: data.tempToken };
    } catch (err) {
      setError(err.message || 'Server connection error');
      throw err;
    }
  };

  const verifyOtp = async (tempToken, otp) => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, otp })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }

      if (data.success && data.user) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('nisanth_user', JSON.stringify(data.user));
        localStorage.setItem('nisanth_token', data.token);
        return { success: true };
      }
    } catch (err) {
      setError(err.message || 'Server connection error');
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('nisanth_user');
    localStorage.removeItem('nisanth_token');
  };

  const updateProfileLocal = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('nisanth_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, sendOtp, verifyOtp, logout, updateProfileLocal }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
