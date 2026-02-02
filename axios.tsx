import axios from 'axios';

const baseURL =
  process.env.VITE_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export const API = axios.create({
  baseURL,
});
