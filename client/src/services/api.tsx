import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL}/api` || 'http://localhost:3001/api',
  withCredentials: true,
});

export default api;