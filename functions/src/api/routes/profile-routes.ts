import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import type { AuthenticatedUserRequest } from "../middleware/validate-user-token.js";
import {
  validateRequestBody,
  sendErrorResponse,
} from "../lib/request-validator.js";
import {
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
} from "../../data/auth.js";

const UpdateProfileSchema = z.object({
  displayName: z.string().optional(),
  photoURL: z.string().url().optional(),
});

type UpdateProfileRequest = z.infer<typeof UpdateProfileSchema>;

const router = Router();

// ──────────────────────────────────────────────────────────────────────────
// GET /api/v1/profile/me
// Retrieve authenticated user's profile
// ──────────────────────────────────────────────────────────────────────────

router.get("/me", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req as AuthenticatedUserRequest;

    const result = await getUserProfile(userId);
    if (!result.ok) {
      sendErrorResponse(result.error, res, 404);
      return;
    }

    res.status(200).json({
      success: true,
      user: result.value,
    });
  } catch (error) {
    sendErrorResponse(error, res);
  }
});

// ──────────────────────────────────────────────────────────────────────────
// POST /api/v1/profile/me
// Update authenticated user's profile
// ──────────────────────────────────────────────────────────────────────────

router.post("/me", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req as AuthenticatedUserRequest;

    const input = await validateRequestBody(UpdateProfileSchema, req, res);
    if (!input) return;

    const result = await updateUserProfile(
      userId,
      input as UpdateProfileRequest,
    );
    if (!result.ok) {
      sendErrorResponse(result.error, res, 500);
      return;
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    sendErrorResponse(error, res);
  }
});

// ──────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/profile/me
// Delete user account and associated organization data
// ──────────────────────────────────────────────────────────────────────────

router.delete("/me", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req as AuthenticatedUserRequest;

    const result = await deleteUserAccount(userId);
    if (!result.ok) {
      sendErrorResponse(result.error, res, 500);
      return;
    }

    res.status(200).json({
      success: true,
      message: "Account scheduled for deletion",
    });
  } catch (error) {
    sendErrorResponse(error, res);
  }
});

export { router as profileRouter };
