import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
});

// Automatically attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.authorization = `Bearer ${token}`;
  }
  return config;
});

// Any 401 (expired token, deleted account) logs the user out straight away.
// AuthContext registers the handler via setOnUnauthorized.
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

