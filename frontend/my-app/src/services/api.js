import axios from 'axios';

/**
 * Axios instance for frontend API calls.
 * If VITE_API_URL is provided, ensure it targets the backend API prefix (ends with /api).
 * Otherwise use the Vite dev proxy at '/api'.
 */
const rawUrl = import.meta.env.VITE_API_URL || '';
let baseURL = rawUrl || '/api';

if (rawUrl) {
  // Ensure baseURL ends with '/api' so api.get('/quizzes') -> http://host:port/api/quizzes
  baseURL = rawUrl.endsWith('/api') ? rawUrl : rawUrl.replace(/\/+$/, '') + '/api';
}

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  // Look for token in multiple possible localStorage shapes
  let token = localStorage.getItem('token');

  if (!token) {
    const raw = localStorage.getItem('userInfo') || localStorage.getItem('user') || localStorage.getItem('auth');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        token = parsed?.token || parsed?.accessToken || parsed?.data?.token || parsed?.user?.token || parsed?.user?.accessToken;
      } catch (err) {
        // raw value might be the token string itself
        if (typeof raw === 'string' && raw.length > 0) token = raw;
      }
    }
  }

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}, (error) => Promise.reject(error));

export default api;