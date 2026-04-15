import type { Request, Response, NextFunction } from "express";
import { getAuth } from "firebase-admin/auth";

export interface AuthenticatedUserRequest extends Request {
  userId: string;
  email?: string;
  userToken?: string;
}

/**
 * Middleware to validate user authentication via Firebase ID token.
 * Checks Authorization header for Bearer token.
 * Sets userId and email on the request for use in route handlers.
 */
export async function validateUserToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers["authorization"] as string | undefined;
    const token = authHeader?.startsWith("Bearer ") ?
      authHeader.slice(7) :
      undefined;

    if (!token || !token.trim()) {
      res.status(401).json({
        error: "MISSING_TOKEN",
        message:
          "Missing authentication token. Provide via Authorization header.",
      });
      return;
    }

    // Verify the token using Firebase Admin SDK
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token.trim());

    // Attach user info to request
    (req as AuthenticatedUserRequest).userId = decodedToken.uid;
    (req as AuthenticatedUserRequest).email = decodedToken.email;
    (req as AuthenticatedUserRequest).userToken = token.trim();

    next();
  } catch (error) {
    console.error("[validateUserToken] Error verifying token:", error);
    res.status(401).json({
      error: "INVALID_TOKEN",
      message: "Invalid or expired authentication token.",
    });
  }
}
