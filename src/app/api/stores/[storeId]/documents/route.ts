/**
 * GET /api/stores/[storeId]/documents — Paginated document listing with filtering and sorting
 * Supports filtering by kind, search by name prefix, and cursor-based pagination
 */

import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { listDocumentsQuery } from "@/data/stores/queries/list-documents-query";
import { DocumentListQuerySchema } from "@/data/stores/dto/store-query-dto";

const statusMap: Record<string, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHENTICATED: 401,
  INTERNAL_ERROR: 500,
};

/**
 * GET handler with cursor-based pagination, kind filtering, and search
 * Query params: q (search), sort, kind (filter), cursor, limit
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  await connection();
  const { storeId } = await params;

  return withAuthenticatedContext(async (ctx) => {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get("limit")
      ? Number.parseInt(searchParams.get("limit") ?? "25", 10)
      : 25;

    const parsed = DocumentListQuerySchema.safeParse({
      q: searchParams.get("q") || undefined,
      sort: searchParams.get("sort") || "createdAt_desc",
      kind: searchParams.get("kind") || undefined,
      fileType: searchParams.get("fileType") || undefined,
      status: searchParams.get("status") || undefined,
      cursor: searchParams.get("cursor") || undefined,
      limit,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: `Invalid query parameters: ${parsed.error.message}`,
        },
        { status: 400 },
      );
    }

    const result = await listDocumentsQuery(ctx.orgId, storeId, {
      q: parsed.data.q,
      sort: parsed.data.sort,
      kind: parsed.data.kind,
      fileType: parsed.data.fileType,
      status: parsed.data.status,
      cursor: parsed.data.cursor,
      limit: parsed.data.limit,
    });

    if (!result.ok) {
      const status = statusMap[result.error.code] ?? 500;
      return NextResponse.json(
        { error: result.error.code, message: result.error.message },
        { status },
      );
    }

    return NextResponse.json({
      documents: result.value.items,
      nextCursor: result.value.nextCursor,
    });
  }).catch((e: unknown) => {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status =
      message.includes("session") || message.includes("auth") ? 401 : 500;
    const code = status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR";
    return NextResponse.json({ error: code }, { status });
  });
}
