import axios from 'axios';
import storage from '../utils/storage';

const API = axios.create({
  baseURL: 'http://192.168.1.73:8000/api',
});

// Before every request, read the JWT from device storage and attach it
API.interceptors.request.use(async (config) => {
  const token = await storage.getItem('token');
  if (token) config.headers.authorization = `Bearer ${token}`;
  return config;
});

export default API;
