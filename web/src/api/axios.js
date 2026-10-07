import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
});

// Automatically attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
      //this makes curl and frontend calls consistent
    config.headers.authorization = `Bearer ${token}`;  }
  return config;
});

export default API;