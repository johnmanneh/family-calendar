import axios from 'axios';
import storage from '../utils/storage';

export const SERVER_URL = 'https://family-calendar-production-33b3.up.railway.app';
export const BASE_URL   = `${SERVER_URL}/api`;

const API = axios.create({
  baseURL: BASE_URL,
});

// Before every request, read the JWT from device storage and attach it
API.interceptors.request.use(async (config) => {
  const token = await storage.getItem('token');
  if (token) config.headers.authorization = `Bearer ${token}`;
  return config;
});

// Any 401 (expired token, deleted account) logs the user out straight away,
// instead of showing a calendar that can't load. AuthContext registers the handler.
let onUnauthorized = null;
export const setOnUnauthorized = (fn) => { onUnauthorized = fn; };

API.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/register');
    if (err.response?.status === 401 && !isAuthCall) onUnauthorized?.();
    return Promise.reject(err);
  }
);

export default API;
