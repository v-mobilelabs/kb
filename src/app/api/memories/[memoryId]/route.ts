import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { revalidateTag } from "next/cache";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { MemoryRepository } from "@/data/memories/repositories/memory-repository";
import { MemoryDocumentRepository } from "@/data/memories/repositories/memory-document-repository";
import { UpdateMemorySchema } from "@/data/memories/schemas";
import { memoriesCacheTag, memoryDetailCacheTag } from "@/lib/cache-tags";
import { Timestamp } from "firebase-admin/firestore";

const statusMap: Record<string, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHENTICATED: 401,
  INTERNAL_ERROR: 500,
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ memoryId: string }> },
) {
  await connection();
  const { memoryId } = await params;

  return withAuthenticatedContext(async (ctx) => {
    const repo = new MemoryRepository(ctx.orgId);
    const result = await repo.findById(memoryId);

    if (!result.ok) {
      const status = statusMap[result.error.code] ?? 500;
      return NextResponse.json(
        { error: result.error.code, message: result.error.message },
        { status },
      );
    }

    return NextResponse.json(result.value);
  }).catch((e: unknown) => {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status =
      message.includes("session") || message.includes("auth") ? 401 : 500;
    const code = status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR";
    return NextResponse.json({ error: code }, { status });
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ memoryId: string }> },
) {
  await connection();
  const { memoryId } = await params;

  return withAuthenticatedContext(async (ctx) => {
    const body = await request.json();
    const parsed = UpdateMemorySchema.safeParse({ ...body, memoryId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: parsed.error.message },
        { status: 400 },
      );
    }

    const repo = new MemoryRepository(ctx.orgId);
    const existing = await repo.findById(memoryId);
    if (!existing.ok) {
      const status = statusMap[existing.error.code] ?? 500;
      return NextResponse.json(
        { error: existing.error.code, message: existing.error.message },
        { status },
      );
    }

    const updates: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };
    if (parsed.data.description !== undefined)
      updates.description = parsed.data.description;
    if (parsed.data.documentCapacity !== undefined)
      updates.documentCapacity = parsed.data.documentCapacity;
    if (parsed.data.condenseThresholdPercent !== undefined)
      updates.condenseThresholdPercent = parsed.data.condenseThresholdPercent;

    const updateResult = await repo.update(memoryId, updates);
    if (!updateResult.ok) {
      const status = statusMap[updateResult.error.code] ?? 500;
      return NextResponse.json(
        { error: updateResult.error.code, message: updateResult.error.message },
        { status },
      );
    }

    // If capacity reduced below current count, evict oldest documents
    if (
      parsed.data.documentCapacity !== undefined &&
      parsed.data.documentCapacity < existing.value.documentCount
    ) {
      const docRepo = new MemoryDocumentRepository(ctx.orgId, memoryId);
      await docRepo.evictOldestDocumentsToCapacity(
        existing.value.documentCount,
        parsed.data.documentCapacity,
      );
    }

    const refreshed = await repo.findById(memoryId);
    if (!refreshed.ok) {
      return NextResponse.json(
        { error: refreshed.error.code, message: refreshed.error.message },
        { status: 500 },
      );
    }

    revalidateTag(memoriesCacheTag(ctx.orgId), "max");
    revalidateTag(memoryDetailCacheTag(ctx.orgId, memoryId), "max");
    return NextResponse.json(refreshed.value);
  }).catch((e: unknown) => {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status =
      message.includes("session") || message.includes("auth") ? 401 : 500;
    const code = status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR";
    return NextResponse.json({ error: code }, { status });
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ memoryId: string }> },
) {
  await connection();
  const { memoryId } = await params;

  return withAuthenticatedContext(async (ctx) => {
    const repo = new MemoryRepository(ctx.orgId);
    const result = await repo.deleteWithDocuments(memoryId);

    if (!result.ok) {
      const status = statusMap[result.error.code] ?? 500;
      return NextResponse.json(
        { error: result.error.code, message: result.error.message },
        { status },
      );
    }

    revalidateTag(memoriesCacheTag(ctx.orgId), "max");
    revalidateTag(memoryDetailCacheTag(ctx.orgId, memoryId), "max");
    return NextResponse.json({
      success: true,
      deletedCount: result.value.deletedCount,
    });
  }).catch((e: unknown) => {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status =
      message.includes("session") || message.includes("auth") ? 401 : 500;
    const code = status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR";
    return NextResponse.json({ error: code }, { status });
  });
}
