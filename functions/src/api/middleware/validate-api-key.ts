import type { Request, Response, NextFunction } from "express";
import { getAdminRtdb } from "../../lib/admin-rtdb.js";

export interface AuthenticatedRequest extends Request {
  orgId: string;
  apiKeyId: string;
}

/**
 * Middleware to validate API key and extract orgId.
 * Checks Authorization header or X-API-Key header for the API key.
 * Looks up the key in RTDB (cached from Firestore on creation; removed on revoke/delete).
 * Sets orgId and apiKeyId on the request for use in route handlers.
 */
export async function validateApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Extract API key from Authorization header (Bearer token) or X-API-Key header
    const authHeader = req.headers["authorization"] as string | undefined;
    const apiKey = authHeader?.startsWith("Bearer ") ?
      authHeader.slice(7) :
      (req.headers["x-api-key"] as string | undefined);

    if (!apiKey || !apiKey.trim()) {
      res.status(401).json({
        error: "MISSING_API_KEY",
        message:
          "Missing API key. Provide via Authorization or X-API-Key header.",
      });
      return;
    }

    // Look up the API key in RTDB cache (O(1), no Firestore query)
    const snap = await getAdminRtdb().ref(`apiKeys/${apiKey.trim()}`).get();

    if (!snap.exists()) {
      res.status(401).json({
        error: "INVALID_API_KEY",
        message: "Invalid or revoked API key.",
      });
      return;
    }

    const data = snap.val() as { orgId?: string; apiKeyId?: string } | null;
    const orgId = data?.orgId;
    const apiKeyId = data?.apiKeyId;

    if (!orgId || !apiKeyId) {
      console.error("[validateApiKey] Malformed RTDB entry for key");
      res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "API key misconfiguration.",
      });
      return;
    }

    // Attach to request
    (req as AuthenticatedRequest).orgId = orgId;
    (req as AuthenticatedRequest).apiKeyId = apiKeyId;

    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[validateApiKey] Error:", message);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to validate API key.",
    });
  }
}
