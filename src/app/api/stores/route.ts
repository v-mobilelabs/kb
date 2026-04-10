/**
 * GET /api/stores — Paginated store listing with search, sort, cursor pagination
 * Queries are cached server-side via 'use cache'; invalidated by mutations via revalidateTag
 */

import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { listStoresQuery } from "@/data/stores/queries/list-stores-query";
import { StoreListQuerySchema } from "@/data/stores/dto/store-query-dto";

const statusMap: Record<string, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHENTICATED: 401,
  INTERNAL_ERROR: 500,
};

/**
 * GET handler with cursor-based pagination
 * Query params: q (search), sort, cursor, limit
 */
export async function GET(request: NextRequest) {
  await connection();

  return withAuthenticatedContext(async (ctx) => {
    const searchParams = request.nextUrl.searchParams;
    const params = {
      q: searchParams.get("q") || undefined,
      sort: searchParams.get("sort") || "createdAt_desc",
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit")
        ? Number.parseInt(searchParams.get("limit") ?? "25", 10)
        : 25,
    };

    const parsed = StoreListQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: `Invalid query parameters: ${parsed.error.message}`,
        },
        { status: 400 },
      );
    }

    const result = await listStoresQuery(ctx.orgId, parsed.data);

    if (!result.ok) {
      const status = statusMap[result.error.code] ?? 500;
      return NextResponse.json(
        { error: result.error.code, message: result.error.message },
        { status },
      );
    }

    return NextResponse.json({
      items: result.value.items,
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
