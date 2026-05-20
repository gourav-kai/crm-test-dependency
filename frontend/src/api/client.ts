/**
 * ApiError — represents a failed API response
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string = 'UNKNOWN_ERROR',
    public details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

type ApiInit = RequestInit & { auth?: boolean };

const API_PREFIX = '/api';
const TOKEN_KEY = 'mvp-crm-token';

function toApiPath(path: string) {
  return path.startsWith(API_PREFIX) ? path : `${API_PREFIX}${path}`;
}

function buildHeaders(init?: ApiInit) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (init?.auth !== false) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  if (init?.headers) {
    const initHeaders = init.headers as Record<string, string>;
    Object.assign(headers, initHeaders);
  }

  return headers;
}

/**
 * Thin fetch wrapper with JWT support and error handling
 *
 * @param path - API endpoint path (e.g., '/api/users')
 * @param init - Optional fetch init object (method, body, headers, etc.)
 * @returns Parsed JSON response
 * @throws ApiError on non-2xx response or network error
 *
 * @example
 * const user = await api<User>('/api/users/1');
 * const created = await api<User>('/api/users', {
 *   method: 'POST',
 *   body: JSON.stringify({ name: 'Alice' }),
 * });
 */
export async function api<T>(
  path: string,
  init?: ApiInit
): Promise<T> {
  try {
    const headers = buildHeaders(init);
    const { auth: authEnabled, ...requestInit } = init ?? {};
    void authEnabled;
    const options: RequestInit = {
      method: 'GET',
      ...requestInit,
      headers,
    };

    const response = await fetch(toApiPath(path), options);

    if (!response.ok) {
      interface ErrorEnvelope {
        error?: {
          code?: string;
          message?: string;
          details?: Record<string, unknown>;
        };
        code?: string;
        message?: string;
        details?: Record<string, unknown>;
      }

      let errorData: ErrorEnvelope = {
        code: 'UNKNOWN_ERROR',
        message: `HTTP ${response.status}`,
      };

      try {
        errorData = await response.json();
      } catch {
        // If response is not JSON, use default
      }

      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }

      const envelope = errorData.error ?? errorData;
      throw new ApiError(
        response.status,
        envelope.message || `HTTP ${response.status}`,
        envelope.code || 'UNKNOWN_ERROR',
        envelope.details || {}
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Network error';
    throw new ApiError(0, message, 'NETWORK_ERROR', {});
  }
}
