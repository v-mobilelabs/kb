import type { Request, Response } from "express";
import { z, type ZodSchema } from "zod";

/**
 * Validates request body against a Zod schema.
 * Returns parsed data or sends 400 error response and returns false.
 */
export async function validateRequestBody<T>(
  schema: ZodSchema<T>,
  req: Request,
  res: Response,
): Promise<T | null> {
  try {
    return schema.parse(req.body);
  } catch (err) {
    res.status(400).json({
      error: "Invalid request parameters",
      details: err instanceof z.ZodError ? err.errors : String(err),
    });
    return null;
  }
}

/**
 * Validates request params against a Zod schema.
 * Returns parsed data or sends 400 error response and returns null.
 */
export async function validateRequestParams<T>(
  schema: ZodSchema<T>,
  req: Request,
  res: Response,
): Promise<T | null> {
  try {
    return schema.parse(req.params);
  } catch (err) {
    res.status(400).json({
      error: "Invalid request parameters",
      details: err instanceof z.ZodError ? err.errors : String(err),
    });
    return null;
  }
}

/**
 * Sends a standardized error response based on error type.
 */
export function sendErrorResponse(
  err: unknown,
  res: Response,
  defaultStatus = 500,
  defaultError = "Internal server error",
): void {
  let message = "";

  if (err instanceof Error) {
    message = err.message;
  } else if (typeof err === "object" && err !== null) {
    // Handle objects with message property (AppError, result objects, etc.)
    message = (err as Record<string, unknown>).message ?
      String((err as Record<string, unknown>).message) :
      String(err);
  } else {
    message = String(err);
  }

  if (message === "Store not found") {
    res.status(404).json({ error: "Store not found" });
  } else if (message === "Forbidden") {
    res.status(403).json({ error: "Forbidden" });
  } else {
    res.status(defaultStatus).json({
      error: defaultError,
      details: message,
    });
  }
}
