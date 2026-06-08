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
      let parsedUser = null;
      try {
        if (savedUser) {
          parsedUser = JSON.parse(savedUser);
        }
      } catch (e) {
        console.error('[AuthContext] Failed to parse saved user:', e);
      }

      // Call backend verification
      fetch(`${API_URL}/api/auth/verify`, {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      })
      .then(res => {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Session expired');
        }
        if (!res.ok) {
          throw new Error('Server unreachable');
        }
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
        if (err.message === 'Session expired') {
          console.warn('[AuthContext] Verification failed, clearing session:', err.message);
          // Clear session since it's invalid/expired
          localStorage.removeItem('nisanth_user');
          localStorage.removeItem('nisanth_token');
          setUser(null);
          setToken(null);
        } else {
          console.warn('[AuthContext] Server error or unreachable. Retaining local session:', err.message);
          // Retain local session for offline sandbox access
          if (parsedUser) {
            setUser(parsedUser);
            setToken(savedToken);
          }
        }
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
        return { otpRequired: true, message: data.message };
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

  const enterOfflineSandbox = (role = 'owner') => {
    const mockUser = role === 'owner' ? {
      name: "Gokul",
      email: "prasanthgokul736@gmail.com",
      phone: "+917094610210",
      role: "owner",
      bio: "Gokul - The coding wizard and founder of our Besties Vault.",
      relationshipStory: "Started as classroom benchmates, bonding over music and programming. Now sharing a lifelong bond of friendship!",
      avatar: "",
      permissions: { canUpload: true, canDelete: true, canEditTimeline: true }
    } : {
      name: "Nivetha",
      email: "nivethanivetha2109@gmail.com",
      phone: "+916380431813",
      role: "secondary",
      bio: "Nivetha - The creative mind and ultimate guardian of our memories.",
      relationshipStory: "Bonded over coffee talks, life theories, and late-night rants. The ultimate best friend anyone could ever ask for!",
      avatar: "",
      permissions: { canUpload: true, canDelete: true, canEditTimeline: true }
    };

    setUser(mockUser);
    setToken("mock_sandbox_token");
    localStorage.setItem('nisanth_user', JSON.stringify(mockUser));
    localStorage.setItem('nisanth_token', "mock_sandbox_token");
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
    <AuthContext.Provider value={{ user, token, loading, error, login, logout, updateProfileLocal, enterOfflineSandbox }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
