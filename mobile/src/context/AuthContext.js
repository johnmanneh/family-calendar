import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import storage from '../utils/storage';
import API, { setOnUnauthorized } from '../api/axios';
import { clearCache } from '../utils/cache';
import { registerPushToken } from '../utils/registerPushToken';

const AuthContext = createContext();
const PUSH_BINDING_KEY = 'devicePushBinding';
const readBindings = async () => {
  const raw = await storage.getItem(PUSH_BINDING_KEY);
  const value = raw ? JSON.parse(raw) : [];
  return Array.isArray(value) ? value : [value];
};
const ownTokens = (binding) => (binding?.tokens || [binding?.token])
  .filter(value => typeof value === 'string' && value.length > 0);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const session = useRef(null);
  const generation = useRef(0);
  const registration = useRef(Promise.resolve());
  const credentialWrite = useRef(Promise.resolve());
  const loggingOut = useRef(false);
  const logoutTask = useRef(null);

  const startRegistration = (owner) => {
    registration.current = registerPushToken({
      isCurrent: () => session.current === owner && !loggingOut.current,
      // Save before sending: even a lost server response may have bound it.
      onToken: async (pushToken) => {
        const bindings = await readBindings();
        const previous = bindings.find(binding => binding.userId === owner.user.id);
        const tokens = [...new Set([...ownTokens(previous), pushToken])];
        await storage.setItem(PUSH_BINDING_KEY, JSON.stringify([
          ...bindings.filter(binding => binding.userId !== owner.user.id),
          { userId: owner.user.id, tokens },
        ]));
      },
    }).catch(() => {});
  };

  // Only clear a token this installation recorded for this account. A missing
  // record must never become an unconditional clear of another phone's token.
  const logout = () => {
    if (loggingOut.current) return logoutTask.current;
    loggingOut.current = true;
    generation.current += 1;
    const owner = session.current;
    session.current = null;
    logoutTask.current = (async () => {
      try {
        await credentialWrite.current.catch(() => {});
        await registration.current;
        const bindings = await readBindings();
        const binding = owner && bindings.find(item => item.userId === owner.user.id);
        if (binding) {
          for (const ownToken of ownTokens(binding)) {
            await API.put('/auth/push-token', { push_token: null, previous_push_token: ownToken });
          }
          const remaining = bindings.filter(item => item !== binding);
          if (remaining.length) await storage.setItem(PUSH_BINDING_KEY, JSON.stringify(remaining));
          else await storage.deleteItem(PUSH_BINDING_KEY);
        }
      } catch { /* Keep bookkeeping on failure so a later logout can retry. */ }
      try {
        setUser(null);
        setToken(null);
        await storage.deleteItem('token');
        await clearCache(); // next account on this phone starts clean
      } finally {
        loggingOut.current = false;
      }
    })();
    return logoutTask.current;
  };

  useEffect(() => {
    const restoreGeneration = generation.current;
    const restoreUser = async () => {
      try {
        const savedToken = await storage.getItem('token');
        if (generation.current !== restoreGeneration) return;
        if (savedToken) {
          setToken(savedToken);
          const res = await API.get('/auth/me');
          if (generation.current !== restoreGeneration) return;
          const owner = { user: res.data.user, token: savedToken };
          session.current = owner;
          setUser(owner.user);
          startRegistration(owner);
        }
      } catch (err) {
        if (generation.current !== restoreGeneration) return;
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
    if (loggingOut.current) await logoutTask.current;
    if (session.current) await logout();
    generation.current += 1;
    const owner = { user: userData, token: userToken };
    session.current = owner;
    setUser(userData);
    setToken(userToken);
    credentialWrite.current = storage.setItem('token', userToken);
    await credentialWrite.current;
    if (session.current === owner && !loggingOut.current) startRegistration(owner);
  };

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
