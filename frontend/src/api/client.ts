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
  init?: RequestInit
): Promise<T> {
  try {
    // Build headers with JWT if available
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('jwt_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Merge init headers if provided
    if (init?.headers) {
      const initHeaders = init.headers as Record<string, string>;
      Object.assign(headers, initHeaders);
    }

    // Merge init with headers
    const options: RequestInit = {
      method: 'GET',
      ...init,
      headers,
    };

    // Make request
    const response = await fetch(path, options);

    // Handle non-2xx responses
    if (!response.ok) {
      interface ErrorResponse {
        code?: string;
        message?: string;
        details?: Record<string, unknown>;
      }

      let errorData: ErrorResponse = {
        code: 'UNKNOWN_ERROR',
        message: `HTTP ${response.status}`,
      };

      try {
        errorData = await response.json();
      } catch {
        // If response is not JSON, use default
      }

      throw new ApiError(
        response.status,
        errorData.message || `HTTP ${response.status}`,
        errorData.code || 'UNKNOWN_ERROR',
        errorData.details || {}
      );
    }

    // Parse and return successful response
    return await response.json();
  } catch (error) {
    // If already an ApiError, rethrow
    if (error instanceof ApiError) {
      throw error;
    }

    // Convert network errors to ApiError
    const message =
      error instanceof Error ? error.message : 'Network error';
    throw new ApiError(0, message, 'NETWORK_ERROR', {});
  }
}
