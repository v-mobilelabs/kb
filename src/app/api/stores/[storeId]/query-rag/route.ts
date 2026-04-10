/**
 * POST /api/stores/[storeId]/query-rag
 * Proxy endpoint for testing RAG queries with the Cloud Functions endpoint
 * Accepts: storeId, query, optional filters and topK
 * Auth: Via session cookie (user's org context)
 */

import { NextResponse, type NextRequest } from "next/server";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;

  return withAuthenticatedContext(async (ctx) => {
    // Parse request body
    const body = (await request.json()) as {
      query?: string;
      apiKeyId?: string;
      filters?: Record<string, string>;
      topK?: number;
    };

    const { query, apiKeyId, filters, topK } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "query is required" },
        { status: 400 },
      );
    }

    if (!apiKeyId || typeof apiKeyId !== "string") {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "apiKeyId is required" },
        { status: 400 },
      );
    }

    // Read store settings (enableRagEvaluation)
    const storeSnap = await adminDb
      .doc(`organizations/${ctx.orgId}/stores/${storeId}`)
      .get();
    const enableRagEvaluation =
      (storeSnap.data()?.enableRagEvaluation as boolean | undefined) ?? false;

    // Verify the API key belongs to this org
    const keyDoc = await adminDb.collection("api_keys").doc(apiKeyId).get();

    if (!keyDoc.exists) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "API key not found" },
        { status: 403 },
      );
    }

    const keyData = keyDoc.data() as
      | {
          key?: string;
          orgId?: string;
          isRevoked?: boolean;
        }
      | undefined;

    if (keyData?.orgId !== ctx.orgId) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "API key does not belong to this organization",
        },
        { status: 403 },
      );
    }

    if (!keyData?.key || keyData.isRevoked === true) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "API key is revoked or inactive" },
        { status: 403 },
      );
    }

    // Call the Cloud Functions endpoint
    const cloudFunctionsUrl =
      process.env.CLOUD_FUNCTIONS_URL ||
      process.env.NEXT_PUBLIC_CLOUD_FUNCTIONS_URL ||
      "https://api-kmmv2nm7nq-uc.a.run.app";

    const queryInput = {
      storeId,
      orgId: ctx.orgId,
      query: query.trim(),
      filters,
      topK: typeof topK === "number" && topK > 0 ? Math.min(topK, 50) : 10,
      enableRagEvaluation,
    };

    const response = await fetch(`${cloudFunctionsUrl}/api/v1/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${keyData.key}`,
      },
      body: JSON.stringify(queryInput),
    });

    const contentType = response.headers.get("content-type") || "";
    let data: unknown;

    // Safely parse response based on content-type
    if (contentType.includes("application/json")) {
      data = (await response.json()) as unknown;
    } else {
      // If not JSON, get text and log it for debugging
      const text = await response.text();
      console.error("Non-JSON response from Cloud Functions:", {
        status: response.status,
        statusText: response.statusText,
        contentType,
        preview: text.slice(0, 500),
      });
      data = {
        error: "GATEWAY_ERROR",
        message: `Unexpected response from Cloud Functions (${response.status} ${response.statusText})`,
        debug: {
          contentType,
          responsePreview: text.slice(0, 200),
        },
      };
    }

    if (!response.ok) {
      return NextResponse.json(JSON.parse(JSON.stringify(data)), {
        status: response.status,
      });
    }

    return NextResponse.json(JSON.parse(JSON.stringify(data)));
  }).catch((e: unknown) => {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status =
      message.includes("session") || message.includes("auth") ? 401 : 500;
    const code = status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR";
    return NextResponse.json({ error: code }, { status });
  });
}
