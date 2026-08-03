// Attaches the logged-in user's token to every request the app makes to our
// own backend, so pages don't have to remember to add it manually. Requests
// to third-party hosts (Google Maps, SMS gateways, etc.) are left untouched.
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

export const attachAuthToken = (config) => {
  const targetUrl = config.url && config.url.startsWith('http')
    ? config.url
    : `${config.baseURL || ''}${config.url || ''}`;

  if (API_BASE_URL && targetUrl.startsWith(API_BASE_URL)) {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
};

axios.interceptors.request.use(attachAuthToken);
