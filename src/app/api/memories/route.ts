/**
 * POST /api/memories — Create a new memory
 * GET /api/memories — Paginated memory listing with search, sort, cursor pagination
 */

import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { revalidateTag } from "next/cache";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { memoriesCacheTag } from "@/lib/cache-tags";
import { MemoryListQuerySchema } from "@/data/memories/schemas";
import { ListMemoriesUseCase } from "@/data/memories/use-cases/list-memories-use-case";
import { CreateMemoryUseCase } from "@/data/memories/use-cases/create-memory-use-case";

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
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit")
        ? Number.parseInt(searchParams.get("limit") ?? "25", 10)
        : 25,
    };

    const parsed = MemoryListQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: `Invalid query parameters: ${parsed.error.message}`,
        },
        { status: 400 },
      );
    }

    const uc = new ListMemoriesUseCase(ctx.orgId);
    const result = await uc.execute(parsed.data);

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

/**
 * POST handler for creating a new memory
 */
export async function POST(request: NextRequest) {
  await connection();

  return withAuthenticatedContext(async (ctx) => {
    const body = await request.json();

    const uc = new CreateMemoryUseCase(ctx);
    const result = await uc.execute(body);

    if (!result.ok) {
      const status = statusMap[result.error.code] ?? 500;
      return NextResponse.json(
        { error: result.error.code, message: result.error.message },
        { status },
      );
    }

    revalidateTag(memoriesCacheTag(ctx.orgId), "max");
    return NextResponse.json(result.value.memory, { status: 201 });
  }).catch((e: unknown) => {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status =
      message.includes("session") || message.includes("auth") ? 401 : 500;
    const code = status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR";
    return NextResponse.json({ error: code }, { status });
  });
}
