/**
 * Base application error. All thrown errors that should be translated to a
 * structured HTTP response MUST extend this class.
 *
 * @param code    Stable machine-readable error code (e.g. 'NOT_FOUND').
 * @param status  HTTP status code to return.
 * @param message Human-readable message safe to surface to API clients.
 * @param details Optional structured details (e.g. Zod field errors).
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown, message = 'Validation failed') {
    super('VALIDATION_ERROR', 422, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', 403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super('NOT_FOUND', 404, `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', 409, message);
  }
}
