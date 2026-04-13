/**
 * GET /api/files — Paginated file listing with search, sort, filter
 * POST /api/files — Upload a new file (multipart/form-data)
 * Query params for GET: search, sort, order, kinds (comma-separated), cursor, limit
 */

import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { revalidateTag } from "next/cache";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { FileRepository } from "@/data/files/repositories/file-repository";
import { getBucket } from "@/data/files/lib/firebase-storage";
import { inferFileKind } from "@/data/files/lib/infer-file-kind";
import { fileCacheTag } from "@/lib/cache-tags";
import { listFilesQuery } from "@/data/files/queries/list-files-query";
import { z } from "zod";

const statusMap: Record<string, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHENTICATED: 401,
  INTERNAL_ERROR: 500,
};

const FileListQuerySchema = z.object({
  search: z.string().optional(),
  sort: z.enum(["name", "createdAt", "size"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  kinds: z.array(z.string()).optional(), // Already split before schema validation
  cursor: z.string().optional(),
  limit: z.number().default(25),
});

/**
 * GET handler with cursor-based pagination
 */
export async function GET(request: NextRequest) {
  await connection();

  return withAuthenticatedContext(async (ctx) => {
    const searchParams = request.nextUrl.searchParams;
    const params = {
      search: searchParams.get("search") || undefined,
      sort:
        (searchParams.get("sort") as "name" | "createdAt" | "size") ||
        "createdAt",
      order: (searchParams.get("order") as "asc" | "desc") || "desc",
      kinds: searchParams.get("kinds")
        ? searchParams.get("kinds")!.split(",").filter(Boolean)
        : undefined,
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit")
        ? Number.parseInt(searchParams.get("limit") ?? "25", 10)
        : 25,
    };

    const parsed = FileListQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: `Invalid query parameters: ${parsed.error.message}`,
        },
        { status: 400 },
      );
    }

    try {
      const result = await listFilesQuery(ctx.orgId, {
        search: parsed.data.search,
        sort: parsed.data.sort,
        order: parsed.data.order,
        kinds: parsed.data.kinds,
        cursor: parsed.data.cursor,
        limit: parsed.data.limit,
      });

      if (!result.ok) {
        return NextResponse.json(
          { error: result.error.code, message: result.error.message },
          { status: statusMap[result.error.code] || 500 },
        );
      }

      return NextResponse.json(
        {
          files: result.value.files,
          nextCursor: result.value.nextCursor,
          total: result.value.total,
        },
        { status: 200 },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[GET /api/files] Error:", message);
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to fetch files" },
        { status: 500 },
      );
    }
  });
}

const MAX_UPLOAD_BYTES = 52_428_800; // 50 MiB

async function deleteCollidingFile(
  repository: FileRepository,
  existing: { id: string; fileName: string },
  orgId: string,
): Promise<void> {
  const bucket = getBucket();
  const oldPath = `organizations/${orgId}/files/${existing.fileName}`;
  try {
    await bucket.file(oldPath).delete();
  } catch (e) {
    console.warn(`[POST /api/files] Old storage cleanup failed: ${oldPath}`, e);
  }
  try {
    await repository.deleteFile(existing.id);
  } catch (e) {
    console.warn(
      `[POST /api/files] Old Firestore doc cleanup failed: ${existing.id}`,
      e,
    );
  }
}

/**
 * POST /api/files — Upload a file via multipart/form-data
 * Form field name: "file" (binary)
 */
export async function POST(request: NextRequest) {
  await connection();

  return withAuthenticatedContext(async (ctx) => {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Invalid multipart form data" },
        { status: 400 },
      );
    }

    const fileEntry = formData.get("file");
    if (!fileEntry || !(fileEntry instanceof File)) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Missing required 'file' field" },
        { status: 400 },
      );
    }

    if (fileEntry.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: "FILE_TOO_LARGE",
          message: `File exceeds the 50 MB limit (received ${fileEntry.size} bytes)`,
        },
        { status: 413 },
      );
    }

    const mimeType = fileEntry.type || "application/octet-stream";
    const originalName = fileEntry.name || "untitled";
    const kind = inferFileKind(mimeType);

    // Derive extension from original name; omit if none
    const dotIdx = originalName.lastIndexOf(".");
    const ext = dotIdx > 0 ? originalName.slice(dotIdx + 1).toLowerCase() : "";
    const uuid = crypto.randomUUID();
    const fileName = ext ? `${uuid}.${ext}` : uuid;

    const storagePath = `organizations/${ctx.orgId}/files/${fileName}`;

    // Check for an existing file with the same originalName (overwrite on collision)
    const repository = new FileRepository(ctx.orgId);
    const existing = await repository.findByOriginalName(originalName);

    try {
      const buffer = Buffer.from(await fileEntry.arrayBuffer());
      const bucket = getBucket();
      await bucket.file(storagePath).save(buffer, {
        metadata: { contentType: mimeType },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[POST /api/files] Storage upload error:", message);
      return NextResponse.json(
        {
          error: "INTERNAL_ERROR",
          message: "Failed to upload file to storage",
        },
        { status: 500 },
      );
    }

    try {
      const file = await repository.createFile({
        orgId: ctx.orgId,
        originalName,
        fileName,
        size: fileEntry.size,
        mimeType,
        kind,
        uploadedBy: ctx.uid,
      });

      // Remove old file if collision (best-effort; new file already committed)
      if (existing) {
        await deleteCollidingFile(repository, existing, ctx.orgId);
      }

      revalidateTag(fileCacheTag(ctx.orgId), "max");

      return NextResponse.json({ file }, { status: 201 });
    } catch (err) {
      // Firestore write failed — orphaned Storage object is acceptable at this scale;
      // log it so ops can clean up if needed.
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        "[POST /api/files] Firestore write error (orphaned storage):",
        message,
      );
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to save file metadata" },
        { status: 500 },
      );
    }
  });
}
