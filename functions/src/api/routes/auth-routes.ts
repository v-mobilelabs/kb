import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/validate-api-key.js";
import {
  validateRequestBody,
  sendErrorResponse,
} from "../lib/request-validator.js";
import {
  verifyCaptchaToken,
  sendOrgMagicLink,
  verifyIdToken,
  createSessionCookie,
  getOrgMembership,
} from "../../data/auth.js";

// ──────────────────────────────────────────────────────────────────────────
// Schemas
// ──────────────────────────────────────────────────────────────────────────

const SendMagicLinkSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  captchaToken: z.string().optional().default(""),
});

const CallbackSchema = z.object({
  idToken: z.string().trim().min(1, "idToken is required"),
});

type SendMagicLinkRequest = z.infer<typeof SendMagicLinkSchema>;
type CallbackRequest = z.infer<typeof CallbackSchema>;

const router = Router();

// ──────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/magic-link
// Send a magic link to the provided email for organization member authentication
// ──────────────────────────────────────────────────────────────────────────

router.post(
  "/magic-link",
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Extract orgId from authenticated API key
      const { orgId } = req as AuthenticatedRequest;

      // Validate request body
      const input = await validateRequestBody(SendMagicLinkSchema, req, res);
      if (!input) return;

      const { email, captchaToken } = input as SendMagicLinkRequest;

      // Step 1: Verify reCAPTCHA token
      const captchaResult = await verifyCaptchaToken(captchaToken);
      if (!captchaResult.ok) {
        res.status(403).json({
          error: "reCAPTCHA verification failed",
          details: captchaResult.error.message,
        });
        return;
      }

      // Step 2: Send the magic link email with orgId in the callback URL
      const linkResult = await sendOrgMagicLink(email, orgId);
      if (!linkResult.ok) {
        sendErrorResponse(linkResult.error, res, 500);
        return;
      }

      // Step 3: Return success response
      res.status(200).json({
        success: true,
        message: "Magic link sent to email",
      });
    } catch (error) {
      sendErrorResponse(error, res);
    }
  },
);

// ──────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/callback
// Validate the magic link and create a session for the user
// ──────────────────────────────────────────────────────────────────────────

router.post("/callback", async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract orgId from authenticated API key
    const { orgId } = req as AuthenticatedRequest;

    // Validate request body
    const input = await validateRequestBody(CallbackSchema, req, res);
    if (!input) return;

    const { idToken } = input as CallbackRequest;

    // Step 1: Verify the ID token (indicates that the user clicked the magic link)
    const tokenResult = await verifyIdToken(idToken);
    if (!tokenResult.ok) {
      res.status(401).json({
        error: "Invalid magic link",
        details: tokenResult.error.message,
      });
      return;
    }

    const { uid, email } = tokenResult.value;

    // Step 2: Check if user is a member of the organization
    const membershipResult = await getOrgMembership(orgId, uid);
    if (!membershipResult.ok) {
      // User is not a member or membership is soft-deleted
      const statusCode =
        membershipResult.error.code === "NOT_FOUND" ? 404 : 403;
      res.status(statusCode).json({
        error: "User is not authorized for this organization",
        details: membershipResult.error.message,
      });
      return;
    }

    const membership = membershipResult.value;

    // Step 3: Create a session cookie with orgId and role as custom claims
    const sessionResult = await createSessionCookie(
      uid,
      idToken,
      orgId,
      membership.baseRole,
    );
    if (!sessionResult.ok) {
      sendErrorResponse(sessionResult.error, res, 500);
      return;
    }

    const sessionCookie = sessionResult.value;

    // Step 4: Return the session cookie to the client
    // The client will set this as an HTTP-only cookie
    res.status(200).json({
      success: true,
      sessionCookie,
      user: {
        uid,
        email,
        orgId,
        role: membership.baseRole,
      },
    });
  } catch (error) {
    sendErrorResponse(error, res);
  }
});

export { router as authRouter };
