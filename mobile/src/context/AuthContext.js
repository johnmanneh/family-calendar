import React, { createContext, useState, useContext, useEffect } from 'react';
import storage from '../utils/storage';
import API, { setOnUnauthorized } from '../api/axios';
import { clearCache } from '../utils/cache';
import { registerPushToken } from '../utils/registerPushToken';

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
          // Re-register push token on restore in case token rotated or was cleared
          registerPushToken();
        }
      } catch (err) {
        // Only forget the token when the server says it's no good (expired,
        // deleted account). A network error (offline) keeps it for next time.
        const status = err.response?.status;
        if (status === 401 || status === 404) {
          await storage.deleteItem('token');
          await clearCache();
        }
        setToken(null);
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
    // Register push token after login — fire and forget, never blocks login flow
    registerPushToken();
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await storage.deleteItem('token');
    await clearCache();   // next account on this phone starts clean
  };

  // Any 401 from the API (e.g. account deleted) → log out immediately
  useEffect(() => {
    setOnUnauthorized(() => { logout(); });
    return () => setOnUnauthorized(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, authLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);

export default AuthContext;