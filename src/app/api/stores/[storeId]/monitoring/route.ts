import { type NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { getStoreMonitoringQuery } from "@/data/stores/queries/get-store-monitoring-query";

export const GET = async function (
  _request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  await connection();
  const { storeId } = await params;

  return withAuthenticatedContext(async (ctx) => {
    const result = await getStoreMonitoringQuery(ctx, storeId);

    if (!result.ok) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        FORBIDDEN: 403,
        UNAUTHENTICATED: 401,
      };
      const status = statusMap[result.error.code] ?? 500;
      return NextResponse.json({ error: result.error.code }, { status });
    }

    return NextResponse.json(result.value);
  }).catch((e: unknown) => {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status =
      message.includes("session") || message.includes("auth") ? 401 : 500;
    const code = status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR";
    return NextResponse.json({ error: code }, { status });
  });
};
