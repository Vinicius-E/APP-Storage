const LOCALHOST_DEVELOPMENT_API_BASE_URL = 'http://localhost:8080';
const LOOPBACK_DEVELOPMENT_API_BASE_URL = 'http://127.0.0.1:8080';
const PRODUCTION_API_BASE_URL = 'https://api-storage-wivi.onrender.com';

type BrowserLocationShape = {
  hostname?: string;
};

function normalizeApiBaseUrl(rawBaseUrl: string): string {
  const normalizedBaseUrl = rawBaseUrl.trim().replace(/\/+$/, '');

  if (normalizedBaseUrl.toLowerCase().endsWith('/api')) {
    return normalizedBaseUrl.slice(0, -4) || PRODUCTION_API_BASE_URL;
  }

  return normalizedBaseUrl || PRODUCTION_API_BASE_URL;
}

function resolveConfiguredApiBaseUrl(): string | null {
  const configuredApiBaseUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    process.env.VITE_API_BASE_URL ??
    '';

  if (configuredApiBaseUrl.trim() === '') {
    return null;
  }

  return normalizeApiBaseUrl(configuredApiBaseUrl);
}

function resolveBrowserDevelopmentApiBaseUrl(): string | null {
  const browserLocation = (globalThis as { location?: BrowserLocationShape }).location;
  const hostname = String(browserLocation?.hostname ?? '').trim().toLowerCase();

  if (hostname === 'localhost') {
    return LOCALHOST_DEVELOPMENT_API_BASE_URL;
  }

  if (hostname === '127.0.0.1') {
    return LOOPBACK_DEVELOPMENT_API_BASE_URL;
  }

  return null;
}

function resolveFallbackApiBaseUrl(): string {
  const browserDevelopmentApiBaseUrl = resolveBrowserDevelopmentApiBaseUrl();

  if (browserDevelopmentApiBaseUrl) {
    return browserDevelopmentApiBaseUrl;
  }

  return PRODUCTION_API_BASE_URL;
}

export function resolveApiBaseUrl(): string {
  const configuredApiBaseUrl = resolveConfiguredApiBaseUrl();

  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl;
  }

  return normalizeApiBaseUrl(resolveFallbackApiBaseUrl());
}

export const API_BASE_URL = resolveApiBaseUrl();

export const IS_DEVELOPMENT_API_LOGGING_ENABLED =
  (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') ||
  API_BASE_URL.startsWith(LOCALHOST_DEVELOPMENT_API_BASE_URL) ||
  API_BASE_URL.startsWith(LOOPBACK_DEVELOPMENT_API_BASE_URL);
