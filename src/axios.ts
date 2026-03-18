import axios, { AxiosHeaders, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, IS_DEVELOPMENT_API_LOGGING_ENABLED } from './config/apiConfig';

type RequestMetadata = {
  requestId: string;
  startedAt: number;
};

type ApiRequestConfig = InternalAxiosRequestConfig & {
  metadata?: RequestMetadata;
  skipAuth?: boolean;
};

export type ApiRequestOptions = AxiosRequestConfig & {
  skipAuth?: boolean;
};

const DEFAULT_TIMEOUT_MS = 15000;
const SLOW_REQUEST_THRESHOLD_MS = 1000;
const VERY_SLOW_REQUEST_THRESHOLD_MS = 3000;

function createRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildRequestUrl(config?: InternalAxiosRequestConfig): string {
  return `${config?.baseURL ?? ''}${config?.url ?? ''}` || '<unknown-url>';
}

function buildRequestLabel(config?: InternalAxiosRequestConfig): string {
  const method = String(config?.method ?? 'get').toUpperCase();
  const url = buildRequestUrl(config);
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

function logApiRequestFailureDetailsForDevelopment(error: unknown): void {
  if (!IS_DEVELOPMENT_API_LOGGING_ENABLED || !error || typeof error !== 'object') {
    return;
  }

  const requestConfig = (error as { config?: InternalAxiosRequestConfig }).config;
  const statusCode =
    (error as { response?: { status?: number } }).response?.status ?? '<no-status>';
  const responseData = (error as { response?: { data?: unknown } }).response?.data;
  const requestMethod = String(requestConfig?.method ?? 'get').toUpperCase();
  const requestUrl = buildRequestUrl(requestConfig);

  console.error('[API][DEV] Request failed', {
    requestMethod,
    requestUrl,
    statusCode,
    responseData,
  });
}

const baseURL = API_BASE_URL.replace(/\/+$/, '');

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

  if (requestConfig.skipAuth || !authToken) {
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
    logApiRequestFailureDetailsForDevelopment(error);
    return Promise.reject(error);
  }
);
