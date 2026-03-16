import { getApiErrorMessage, getApiErrorStatus, isConflictError } from '../services/http/apiError';

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
  if (isConflictError(error)) {
    const conflictMessage = sanitizeMessageCandidate(getApiErrorMessage(error));
    return (
      conflictMessage ??
      'Os dados foram alterados por outro usuario. Atualize a tela e tente novamente.'
    );
  }

  const status = getApiErrorStatus(error);
  const message = getApiErrorMessage(error);
  const candidate = sanitizeMessageCandidate(message);

  if (status === 401 || status === 403) {
    return candidate ?? 'Voce nao tem permissao para concluir esta operacao.';
  }

  return candidate ?? fallback;
}
