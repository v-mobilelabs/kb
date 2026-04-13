import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import Busboy from "busboy";
import {
  validateRequestParams,
  sendErrorResponse,
} from "../lib/request-validator.js";
import { createFile, getFile, deleteFile } from "../../data/files.js";
import { getBucket } from "../../lib/admin-storage.js";
import type { AuthenticatedRequest } from "../middleware/validate-api-key.js";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * Parse a multipart/form-data upload from req.rawBody.
 * The functions-framework's bodyParser.raw() consumes the request stream before
 * user middleware runs, storing raw bytes in req.rawBody. This function feeds
 * that buffer directly into busboy so the upload still works correctly.
 */
async function parseUploadedFile(req: Request): Promise<{
  buffer: Buffer;
  originalname: string;
  mimetype: string;
} | null> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!rawBody || rawBody.length === 0) {
      resolve(null);
      return;
    }

    const bb = Busboy({ headers: req.headers });
    let result: { buffer: Buffer; originalname: string; mimetype: string } | null = null;

    bb.on("file", (_fieldname, file, info) => {
      const chunks: Buffer[] = [];
      file.on("data", (chunk: Buffer) => chunks.push(chunk));
      file.on("end", () => {
        result = {
          buffer: Buffer.concat(chunks),
          originalname: info.filename || "unknown",
          mimetype: info.mimeType || "application/octet-stream",
        };
      });
    });

    bb.on("finish", () => resolve(result));
    bb.on("error", (err: Error) => reject(err));

    bb.write(rawBody);
    bb.end();
  });
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const FileParamSchema = z.object({
  fileId: z.string().trim().min(1, "fileId is required"),
});

const router = Router();

// POST /api/v1/file/upload — Upload a file
router.post("/upload", async (req: Request, res: Response): Promise<void> => {
  const { orgId, apiKeyId } = req as AuthenticatedRequest;

  try {
    const uploadedFile = await parseUploadedFile(req);

    if (!uploadedFile) {
      res.status(400).json({
        error: "MISSING_FILE",
        message: "No file found in multipart form. Ensure the field name is \"file\".",
      });
      return;
    }

    if (uploadedFile.buffer.byteLength > MAX_FILE_SIZE) {
      res.status(413).json({
        error: "FILE_TOO_LARGE",
        message: "File exceeds 50 MB limit",
      });
      return;
    }

    const file = await createFile({
      orgId,
      apiKeyId,
      originalName: uploadedFile.originalname,
      mimeType: uploadedFile.mimetype,
      fileBuffer: uploadedFile.buffer,
    });

    res.status(201).json({ file });
  } catch (err) {
    sendErrorResponse(err, res, 500, "Failed to upload file");
  }
});

// GET /api/v1/file/:fileId/download — Generate a signed download URL
router.get(
  "/:fileId/download",
  async (req: Request, res: Response): Promise<void> => {
    const { orgId } = req as AuthenticatedRequest;

    const params = await validateRequestParams(FileParamSchema, req, res);
    if (!params) return;

    try {
      const file = await getFile(orgId, params.fileId);

      if (!file) {
        res.status(404).json({
          error: "FILE_NOT_FOUND",
          message: "File not found",
        });
        return;
      }

      // Generate signed URL (15-minute expiry)
      const bucket = getBucket();
      const storagePath = `organizations/${orgId}/files/${file.fileName}`;
      const signedUrls = await bucket.file(storagePath).getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      });

      res.json({
        url: signedUrls[0],
        expiresIn: 900, // 15 minutes in seconds
      });
    } catch (err) {
      sendErrorResponse(err, res, 500, "Failed to generate download URL");
    }
  },
);

// GET /api/v1/file/:fileId/thumbnail — Get file thumbnail or fallback icon
router.get(
  "/:fileId/thumbnail",
  async (req: Request, res: Response): Promise<void> => {
    const { orgId } = req as AuthenticatedRequest;

    const params = await validateRequestParams(FileParamSchema, req, res);
    if (!params) return;

    try {
      const file = await getFile(orgId, params.fileId);

      if (!file) {
        res.status(404).json({
          error: "FILE_NOT_FOUND",
          message: "File not found",
        });
        return;
      }

      // For images, return a transformed image URL with thumbnail params
      if (file.kind === "image") {
        // Google Cloud Storage supports image transformation via URL params
        // Example: /=w200-h200 for 200x200 thumbnail
        const bucket = getBucket();
        const storagePath = `organizations/${orgId}/files/${file.fileName}`;

        // Generate signed URL for the thumbnail (with transform params)
        const signedUrls = await bucket.file(storagePath).getSignedUrl({
          version: "v4",
          action: "read",
          expires: Date.now() + 15 * 60 * 1000, // 15 minutes
          queryParams: {
            // Image transformation parameters (if Cloud Storage supports it)
            // Otherwise, serve original and let client handle resizing
          },
        });

        res.json({
          url: signedUrls[0],
          contentType: file.mimeType,
          isImage: true,
        });
        return;
      }

      // For non-images, return a fallback icon/badge as data URL
      // In a real implementation, you might serve SVG icons from /public
      // For now, return a placeholder data URL with file kind
      const fallbackIcons: Record<string, string> = {
        pdf: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4Ij48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiNGRjYzNjMiLz48dGV4dCB4PSIyNCIgeT0iMjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMjAiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSI+UERG PC90ZXh0Pjwvc3ZnPg==", // Red PDF badge
        doc: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4Ij48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiMyMTk2RjMiLz48dGV4dCB4PSIyNCIgeT0iMjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMjAiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSI+RE9DPC90ZXh0Pjwvc3ZnPg==", // Blue DOC badge
        sheet:
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4Ij48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiMzNEE4NTMiLz48dGV4dCB4PSIyNCIgeT0iMjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMjAiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSI+U0hFRVQ8L3RleHQ+PC9zdmc+", // Green SHEET badge
        video:
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4Ij48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiNGRjk4MDAiLz48dGV4dCB4PSIyNCIgeT0iMjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMjAiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSI+VklEPC90ZXh0Pjwvc3ZnPg==", // Orange VIDEO badge
        audio:
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4Ij48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiI5QzI3QjAiLz48dGV4dCB4PSIyNCIgeT0iMjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMjAiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSI+QVVETzwvdGV4dD48L3N2Zz4=", // Purple AUDIO badge
        text: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4Ij48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiM2Mzc2RDUiLz48dGV4dCB4PSIyNCIgeT0iMjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMjAiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSI+VFhUPC90ZXh0Pjwvc3ZnPg==", // Gray TXT badge
        other:
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4Ij48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiM5RTlFOUUiLz48dGV4dCB4PSIyNCIgeT0iMjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMjAiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSI+Rklsrupc8L3RleHQ+PC9zdmc+", // Gray FILE badge
      };

      const iconData = fallbackIcons[file.kind] || fallbackIcons.other;

      res.json({
        data: iconData,
        contentType: "image/svg+xml",
        isImage: false,
      });
    } catch (err) {
      sendErrorResponse(err, res, 500, "Failed to get thumbnail");
    }
  },
);

// DELETE /api/v1/file/:fileId — Delete a file
router.delete(
  "/:fileId",
  async (req: Request, res: Response): Promise<void> => {
    const { orgId, apiKeyId } = req as AuthenticatedRequest;

    const params = await validateRequestParams(FileParamSchema, req, res);
    if (!params) return;

    try {
      const deleted = await deleteFile(orgId, params.fileId, apiKeyId);

      if (!deleted) {
        res.status(404).json({
          error: "FILE_NOT_FOUND",
          message: "File not found",
        });
        return;
      }

      res.json({ deleted: true });
    } catch (err) {
      sendErrorResponse(err, res, 500, "Failed to delete file");
    }
  },
);

export { router as fileRouter };
