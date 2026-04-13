/**
 * GET /api/memories/[memoryId]/documents — Paginated document listing
 * POST /api/memories/[memoryId]/documents — Create a new memory document
 */

import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { MemoryDocumentListQuerySchema } from "@/data/memories/schemas";
import { ListMemoryDocumentsUseCase } from "@/data/memories/use-cases/list-memory-documents-use-case";
import { CreateMemoryDocumentUseCase } from "@/data/memories/use-cases/create-memory-document-use-case";

const statusMap: Record<string, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHENTICATED: 401,
  INTERNAL_ERROR: 500,
};

/**
 * GET handler for listing memory documents
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memoryId: string }> },
) {
  await connection();
  const { memoryId } = await params;

  return withAuthenticatedContext(async (ctx) => {
    const searchParams = request.nextUrl.searchParams;
    const parsed = MemoryDocumentListQuerySchema.safeParse({
      q: searchParams.get("q") || undefined,
      sort: searchParams.get("sort") || "createdAt_desc",
      includeCondensed: searchParams.get("includeCondensed") ?? "true",
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit")
        ? Number.parseInt(searchParams.get("limit") ?? "25", 10)
        : 25,
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

    const uc = new ListMemoryDocumentsUseCase(ctx.orgId);
    const result = await uc.execute({ memoryId, ...parsed.data });

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
 * POST handler for creating a new memory document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memoryId: string }> },
) {
  await connection();
  const { memoryId } = await params;

  return withAuthenticatedContext(async (ctx) => {
    const body = await request.json();

    const uc = new CreateMemoryDocumentUseCase(ctx);
    const result = await uc.execute({ memoryId, ...body });

    if (!result.ok) {
      const status = statusMap[result.error.code] ?? 500;
      return NextResponse.json(
        { error: result.error.code, message: result.error.message },
        { status },
      );
    }

    // Condensation is triggered automatically by Cloud Functions Firestore trigger
    // (onMemoryDocumentCreated) when threshold is met — no action needed here.

    return NextResponse.json(result.value.document, { status: 201 });
  }).catch((e: unknown) => {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status =
      message.includes("session") || message.includes("auth") ? 401 : 500;
    const code = status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR";
    return NextResponse.json({ error: code }, { status });
  });
}
