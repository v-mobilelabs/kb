/**
 * GET /api/files/[fileId] — Get file metadata
 * DELETE /api/files/[fileId] — Delete a file
 *
 * Separate endpoints for specific actions:
 * GET    /api/files/[fileId]/download — Get signed download URL
 * GET    /api/files/[fileId]/thumbnail — Get thumbnail or fallback icon
 */

import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { revalidateTag } from "next/cache";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { FileRepository } from "@/data/files/repositories/file-repository";
import { getBucket } from "@/data/files/lib/firebase-storage";
import { fileCacheTag, fileDetailCacheTag } from "@/lib/cache-tags";

/**
 * GET handler - Returns file metadata
 */
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

      return NextResponse.json({ file }, { status: 200 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[GET /api/files/${fileId}] Error:`, message);
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to fetch file" },
        { status: 500 },
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
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

      // Delete from Cloud Storage first (FR-014: transactional order)
      const bucket = getBucket();
      const storagePath = `organizations/${ctx.orgId}/files/${file.fileName}`;

      // If Storage delete fails, return 500 — do NOT delete Firestore doc
      await bucket.file(storagePath).delete();

      // Storage delete succeeded — now delete from Firestore
      await repository.deleteFile(fileId);

      revalidateTag(fileCacheTag(ctx.orgId), "max");
      revalidateTag(fileDetailCacheTag(ctx.orgId, fileId), "max");

      return NextResponse.json({ deleted: true }, { status: 200 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[DELETE /api/files/${fileId}] Error:`, message);
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to delete file" },
        { status: 500 },
      );
    }
  });
}
