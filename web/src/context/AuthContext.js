import React, { createContext, useState, useContext, useEffect } from 'react';
import API, { setOnUnauthorized } from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [authLoading, setAuthLoading] = useState(!!localStorage.getItem('token'));

  // Restore user on refresh
  useEffect(() => {
    const restoreUser = async () => {
      if (token) {
        try {
          const res = await API.get('/auth/me');
          setUser(res.data.user);
        } catch (err) {
          // Only clear the token when the server rejects it (deleted account, expired).
          // A network error (offline) keeps it so they stay logged in next time.
          const status = err.response?.status;
          if (status === 401 || status === 404) {
            logout();
          }
        } finally {
          setAuthLoading(false);
        }
      }
    };
    restoreUser();
  }, []);

  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setAuthLoading(false);
    localStorage.removeItem('token');
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