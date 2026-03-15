const TECHNICAL_ERROR_PATTERNS = [
  /network error/i,
  /request failed/i,
  /internal server error/i,
  /not found/i,
  /failed to fetch/i,
  /timeout/i,
  /no static resource/i,
  /axios/i,
  /http/i,
  /\b404\b/,
  /\b500\b/,
];

function sanitizeMessageCandidate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return null;
  }

  if (normalized.includes('<html') || normalized.includes('stack trace')) {
    return null;
  }

  return normalized;
}

export function getUserFacingErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const responseData = (error as { response?: { data?: unknown } }).response?.data;
  const responseMessage =
    responseData && typeof responseData === 'object'
      ? (responseData as { message?: unknown }).message
      : undefined;
  const directMessage = (error as { message?: unknown }).message;

  const candidate =
    sanitizeMessageCandidate(responseData) ??
    sanitizeMessageCandidate(responseMessage) ??
    sanitizeMessageCandidate(directMessage);

  return candidate ?? fallback;
}
