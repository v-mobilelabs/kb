"use cache";

import { cacheTag, cacheLife } from "next/cache";
import { fileDetailCacheTag } from "@/lib/cache-tags";
import { FileRepository } from "@/data/files/repositories/file-repository";
import { getBucket } from "@/data/files/lib/firebase-storage";
import { generateSvgIcon } from "@/app/api/files/_lib/generate-svg-icon";
import { ok, err, appError } from "@/lib/result";
import type { Result, AppError } from "@/lib/result";
import type { FileThumbnailResponse } from "@/data/files/models/file.model";

/**
 * Cached query to fetch thumbnail information for a file.
 * For images, returns a signed Storage URL (5-minute expiry).
 * For non-images, returns an SVG icon as a data URL.
 *
 * Tagged per file with a short 5-minute cache life (signed URL validity).
 */
export async function getFileThumbnailQuery(
  orgId: string,
  fileId: string,
): Promise<Result<FileThumbnailResponse, AppError>> {
  cacheTag(fileDetailCacheTag(orgId, fileId));
  cacheLife({ revalidate: 300 }); // 5 minutes — matches signed URL expiry

  const repository = new FileRepository(orgId);
  const file = await repository.getFile(fileId);

  if (!file) {
    return err(appError("NOT_FOUND", "File not found"));
  }

  if (file.kind === "image") {
    const bucket = getBucket();
    const storagePath = `organizations/${orgId}/files/${file.fileName}`;
    const [url] = await bucket.file(storagePath).getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 5 * 60 * 1000,
    });

    return ok({ isImage: true, url, contentType: file.mimeType });
  }

  const data = generateSvgIcon(file.kind);
  return ok({ isImage: false, data, contentType: "image/svg+xml" });
}
