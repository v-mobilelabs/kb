/**
 * GET /api/files/[fileId]/thumbnail — Get image thumbnail or fallback icon
 */

import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { FileRepository } from "@/data/files/repositories/file-repository";
import { getBucket } from "@/data/files/lib/firebase-storage";
import { generateSvgIcon } from "@/app/api/files/_lib/generate-svg-icon";

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

      // For images, return a signed URL to the image
      if (file.kind === "image") {
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
            contentType: file.mimeType,
            isImage: true,
            expiresIn: 900, // 15 minutes in seconds
          },
          { status: 200 },
        );
      }

      // For non-images, return a fallback icon data URL via generateSvgIcon
      const iconData = generateSvgIcon(file.kind);

      return NextResponse.json(
        {
          data: iconData,
          contentType: "image/svg+xml",
          isImage: false,
        },
        { status: 200 },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[GET /api/files/${fileId}/thumbnail] Error:`,
        message,
      );
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to get thumbnail" },
        { status: 500 },
      );
    }
  });
}
