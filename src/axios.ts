import axios, { AxiosHeaders, InternalAxiosRequestConfig } from 'axios';

const rawBaseURL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.VITE_API_BASE_URL ??
  'https://api-storage-wivi.onrender.com';

const baseURL = rawBaseURL.replace(/\/+$/, '');

let authToken: string | null = null;

export function setApiAuthToken(token: string | null): void {
  authToken = token?.trim() ? token : null;
}

export const API = axios.create({
  baseURL,
});

API.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!authToken) {
    return config;
  }

  const headers = AxiosHeaders.from(config.headers ?? {});
  headers.set('Authorization', `Bearer ${authToken}`);
  config.headers = headers;

  return config;
});
