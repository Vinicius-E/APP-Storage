const CANDIDATE_MESSAGE_KEYS = ['message', 'error', 'detail', 'title'] as const;

type ErrorWithResponse = {
  response?: {
    status?: unknown;
    data?: unknown;
  };
  message?: unknown;
};

function sanitizeMessage(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getObjectMessageValue(data: object): string {
  for (const key of CANDIDATE_MESSAGE_KEYS) {
    const value = (data as Record<string, unknown>)[key];
    const normalized = sanitizeMessage(value);

    if (normalized !== '') {
      return normalized;
    }
  }

  return '';
}

export function getApiErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const status = (error as ErrorWithResponse).response?.status;
  return typeof status === 'number' ? status : undefined;
}

export function getApiErrorData(error: unknown): unknown {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  return (error as ErrorWithResponse).response?.data;
}

export function getApiErrorMessage(error: unknown): string {
  const responseData = getApiErrorData(error);

  if (typeof responseData === 'string') {
    return responseData.trim();
  }

  if (responseData && typeof responseData === 'object') {
    const objectMessage = getObjectMessageValue(responseData);

    if (objectMessage !== '') {
      return objectMessage;
    }
  }

  if (error instanceof Error) {
    return error.message.trim();
  }

  if (error && typeof error === 'object') {
    return sanitizeMessage((error as ErrorWithResponse).message);
  }

  return '';
}

export function isUnavailableResourceRoute(
  error: unknown,
  resourceHints: readonly string[]
): boolean {
  const status = getApiErrorStatus(error);
  const normalizedMessage = getApiErrorMessage(error).toLowerCase();

  if (status === 404) {
    return true;
  }

  if (normalizedMessage.includes('no static resource')) {
    return true;
  }

  return resourceHints.some((hint) => normalizedMessage.includes(hint.toLowerCase()));
}

export function isConflictError(error: unknown): boolean {
  const status = getApiErrorStatus(error);
  return status === 409 || status === 412;
}
