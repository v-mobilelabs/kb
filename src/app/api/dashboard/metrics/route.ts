import { type NextRequest, NextResponse } from "next/server";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { getDashboardMetricsQuery } from "@/data/organizations/queries/get-dashboard-metrics-query";

export const GET = async function (_request: NextRequest) {
  return withAuthenticatedContext(async (ctx) => {
    const result = await getDashboardMetricsQuery(ctx, {});

    if (!result.ok) {
      console.error(
        "[metrics-api] Query error:",
        result.error.code,
        result.error.message,
      );
      const status = result.error.code === "UNAUTHENTICATED" ? 401 : 500;
      return NextResponse.json({ error: result.error.code }, { status });
    }

    return NextResponse.json(result.value);
  }).catch((e: unknown) => {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status =
      message.includes("session") || message.includes("auth") ? 401 : 500;
    const code = status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR";
    console.error("[metrics-api] Exception:", code, message);
    return NextResponse.json({ error: code, message }, { status });
  });
};
