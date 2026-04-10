// Result<T, E> — functional error handling (Constitution IV: no thrown business errors)

export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT"
  | "RATE_LIMIT_EXCEEDED"
  | "UNAUTHENTICATED"
  | "ALREADY_REVOKED";

export interface AppError {
  code: AppErrorCode;
  message: string;
  cause?: unknown;
}

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E = AppError>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function appError(
  code: AppErrorCode,
  message: string,
  cause?: unknown,
): AppError {
  return { code, message, cause };
}
