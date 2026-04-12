import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { MemoryRepository } from "@/data/memories/repositories/memory-repository";
import { MemoryDocumentRepository } from "@/data/memories/repositories/memory-document-repository";
import {
  MemoryDocumentListQuerySchema,
  CreateMemoryDocumentSchema,
} from "@/data/memories/schemas";

const statusMap: Record<string, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHENTICATED: 401,
  INTERNAL_ERROR: 500,
};

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

    const repo = new MemoryDocumentRepository(ctx.orgId, memoryId);
    const result = await repo.findByMemoryPaginated(parsed.data);

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memoryId: string }> },
) {
  await connection();
  const { memoryId } = await params;

  return withAuthenticatedContext(async (ctx) => {
    // Verify memory exists
    const memoryRepo = new MemoryRepository(ctx.orgId);
    const memoryResult = await memoryRepo.findById(memoryId);
    if (!memoryResult.ok) {
      const status = statusMap[memoryResult.error.code] ?? 500;
      return NextResponse.json(
        { error: memoryResult.error.code, message: memoryResult.error.message },
        { status },
      );
    }

    const body = await request.json();
    const parsed = CreateMemoryDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: parsed.error.message },
        { status: 400 },
      );
    }

    const memory = memoryResult.value;
    const docRepo = new MemoryDocumentRepository(ctx.orgId, memoryId);

    // FIFO eviction if at capacity
    if (memory.documentCount >= memory.documentCapacity) {
      await docRepo.evictOldestDocumentsToCapacity(
        memory.documentCount,
        memory.documentCapacity - 1, // make room for the new doc
      );
    }

    const now = new Date();
    const result = await docRepo.createWithIncrement({
      title: parsed.data.title,
      content: parsed.data.content ?? "",
      isCondensationSummary: false,
      sessionId: ctx.uid,
      createdAt: now,
      updatedAt: now,
    });

    if (!result.ok) {
      const status = statusMap[result.error.code] ?? 500;
      return NextResponse.json(
        { error: result.error.code, message: result.error.message },
        { status },
      );
    }

    // Condensation is triggered automatically by Cloud Functions Firestore trigger
    // (onMemoryDocumentCreated) when threshold is met — no action needed here.

    return NextResponse.json(result.value, { status: 201 });
  }).catch((e: unknown) => {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status =
      message.includes("session") || message.includes("auth") ? 401 : 500;
    const code = status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR";
    return NextResponse.json({ error: code }, { status });
  });
}
