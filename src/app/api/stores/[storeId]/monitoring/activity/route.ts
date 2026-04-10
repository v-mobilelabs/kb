/**
 * GET /api/stores/[storeId]/monitoring/activity
 * Server-side paginated activity log (ordered by updatedAt desc).
 * Query params: page (1-based), limit (default 10)
 */

import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { z } from "zod";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { ListStoreActivityUseCase } from "@/data/stores/use-cases/list-store-activity-use-case";

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(["enriched", "failed", "processing", "added"]).optional(),
});

const statusMap: Record<string, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHENTICATED: 401,
  INTERNAL_ERROR: 500,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  await connection();
  const { storeId } = await params;

  return withAuthenticatedContext(async (ctx) => {
    const searchParams = request.nextUrl.searchParams;
    const parsed = QuerySchema.safeParse({
      page: searchParams.get("page") ?? 1,
      limit: searchParams.get("limit") ?? 10,
      status: searchParams.get("status") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: parsed.error.message },
        { status: 400 },
      );
    }

    const uc = new ListStoreActivityUseCase(ctx);
    const result = await uc.execute({ storeId, ...parsed.data });

    if (!result.ok) {
      const status = statusMap[result.error.code] ?? 500;
      console.error(
        "[monitoring/activity] use case error",
        result.error.code,
        result.error.message,
      );
      return NextResponse.json(
        { error: result.error.code, message: result.error.message },
        { status },
      );
    }

    return NextResponse.json(result.value);
  }).catch((e: unknown) => {
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[monitoring/activity] Unhandled error:", message, stack);
    const status =
      message.includes("session") || message.includes("auth") ? 401 : 500;
    const code = status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR";
    return NextResponse.json({ error: code, message, stack }, { status });
  });
}
