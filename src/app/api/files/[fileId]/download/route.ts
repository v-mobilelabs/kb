/**
 * GET /api/files/[fileId]/download — Generate signed download URL (15-min expiry)
 */

import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { FileRepository } from "@/data/files/repositories/file-repository";
import { getBucket } from "@/data/files/lib/firebase-storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  await connection();

  return withAuthenticatedContext(async (ctx) => {
    const { fileId } = await params;

    try {
      const repository = new FileRepository(ctx.orgId);
      const file = await repository.getFile(fileId);

      if (!file) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "File not found" },
          { status: 404 },
        );
      }

      // Generate signed URL (15-minute expiry)
      const bucket = getBucket();
      const storagePath = `organizations/${ctx.orgId}/files/${file.fileName}`;
      const signedUrls = await bucket.file(storagePath).getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      });

      return NextResponse.json(
        {
          url: signedUrls[0],
          expiresIn: 900, // 15 minutes in seconds
          fileName: file.originalName,
        },
        { status: 200 },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[GET /api/files/${fileId}/download] Error:`,
        message,
      );
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to generate download URL" },
        { status: 500 },
      );
    }
  });
}
