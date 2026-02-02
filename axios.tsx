import axios from 'axios';

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api';

export const API = axios.create({
  baseURL,
});
