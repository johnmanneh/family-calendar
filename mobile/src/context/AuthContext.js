import React, { createContext, useState, useContext, useEffect } from 'react';
import storage from '../utils/storage';
import API from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Restore user on app open — check device storage for saved token
  useEffect(() => {
    const restoreUser = async () => {
      try {
        const savedToken = await storage.getItem('token');
        if (savedToken) {
          setToken(savedToken);
          const res = await API.get('/auth/me');
          setUser(res.data.user);
        }
      } catch (err) {
        await storage.deleteItem('token'); // token expired or invalid
      } finally {
        setAuthLoading(false);
      }
    };
    restoreUser();
  }, []);

  const login = async (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    await storage.setItem('token', userToken);
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await storage.deleteItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, authLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);

export default AuthContext;