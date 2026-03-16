import axios, { AxiosHeaders, InternalAxiosRequestConfig } from 'axios';

type RequestMetadata = {
  requestId: string;
  startedAt: number;
};

type ApiRequestConfig = InternalAxiosRequestConfig & {
  metadata?: RequestMetadata;
};

const DEFAULT_API_BASE_URL = 'https://api-storage-wivi.onrender.com';
const DEFAULT_TIMEOUT_MS = 15000;
const SLOW_REQUEST_THRESHOLD_MS = 1000;
const VERY_SLOW_REQUEST_THRESHOLD_MS = 3000;

function resolveApiBaseUrl(): string {
  const configuredBaseUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    process.env.VITE_API_BASE_URL ??
    DEFAULT_API_BASE_URL;

  const normalizedBaseUrl = configuredBaseUrl.trim().replace(/\/+$/, '');

  if (normalizedBaseUrl.toLowerCase().endsWith('/api')) {
    return normalizedBaseUrl.slice(0, -4) || DEFAULT_API_BASE_URL;
  }

  return normalizedBaseUrl || DEFAULT_API_BASE_URL;
}

function createRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildRequestLabel(config?: InternalAxiosRequestConfig): string {
  const method = String(config?.method ?? 'get').toUpperCase();
  const url = `${config?.baseURL ?? ''}${config?.url ?? ''}` || '<unknown-url>';
  return `${method} ${url}`;
}

function logApiRequestCompletion(
  config: ApiRequestConfig | undefined,
  statusCode?: number,
  failed = false
): void {
  const startedAt = config?.metadata?.startedAt;

  if (!startedAt) {
    return;
  }

  const durationMs = Date.now() - startedAt;
  const label = buildRequestLabel(config);
  const requestId = config?.metadata?.requestId ?? 'unknown-request';
  const suffix = statusCode ? ` [${statusCode}]` : '';
  const logMessage = `[API][${requestId}] ${label}${suffix} ${durationMs}ms`;

  if (failed || durationMs >= VERY_SLOW_REQUEST_THRESHOLD_MS) {
    console.error(logMessage);
    return;
  }

  if (durationMs >= SLOW_REQUEST_THRESHOLD_MS) {
    console.warn(logMessage);
  }
}

const rawBaseURL = resolveApiBaseUrl();

const baseURL = rawBaseURL.replace(/\/+$/, '');

let authToken: string | null = null;

export function setApiAuthToken(token: string | null): void {
  authToken = token?.trim() ? token : null;
}

export const API = axios.create({
  baseURL,
  timeout: DEFAULT_TIMEOUT_MS,
});

API.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const requestConfig = config as ApiRequestConfig;
  requestConfig.metadata = {
    requestId: createRequestId(),
    startedAt: Date.now(),
  };

  if (!authToken) {
    return requestConfig;
  }

  const headers = AxiosHeaders.from(requestConfig.headers ?? {});
  headers.set('Authorization', `Bearer ${authToken}`);
  requestConfig.headers = headers;

  return requestConfig;
});

API.interceptors.response.use(
  (response) => {
    logApiRequestCompletion(response.config as ApiRequestConfig, response.status);
    return response;
  },
  (error) => {
    const statusCode =
      error && typeof error === 'object'
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;

    logApiRequestCompletion(error.config as ApiRequestConfig | undefined, statusCode, true);
    return Promise.reject(error);
  }
);
