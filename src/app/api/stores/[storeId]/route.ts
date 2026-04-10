/**
 * GET /api/stores/[storeId] — Fetch a single store by ID
 * Verifies the store belongs to the authenticated user's organization
 */

import { NextResponse, type NextRequest } from "next/server";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { getStoreQuery } from "@/data/stores/queries/get-store-query";

const statusMap: Record<string, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHENTICATED: 401,
  INTERNAL_ERROR: 500,
};

/**
 * GET handler for single store details
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;

  return withAuthenticatedContext(async (ctx) => {
    const result = await getStoreQuery(ctx.orgId, storeId);

    if (!result.ok) {
      const status = statusMap[result.error.code] ?? 500;
      return NextResponse.json(
        { error: result.error.code, message: result.error.message },
        { status },
      );
    }

    if (result.value.orgId !== ctx.orgId) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Store does not belong to your organisation",
        },
        { status: 403 },
      );
    }

    return NextResponse.json({ store: result.value });
  }).catch((e: unknown) => {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status =
      message.includes("session") || message.includes("auth") ? 401 : 500;
    const code = status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR";
    return NextResponse.json({ error: code }, { status });
  });
}
