/**
 * GET /api/memories/[memoryId] — Fetch a single memory by ID
 * PUT /api/memories/[memoryId] — Update a memory
 * DELETE /api/memories/[memoryId] — Delete a memory
 */

import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { revalidateTag } from "next/cache";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { memoriesCacheTag, memoryDetailCacheTag } from "@/lib/cache-tags";
import { GetMemoryUseCase } from "@/data/memories/use-cases/get-memory-use-case";
import { UpdateMemoryUseCase } from "@/data/memories/use-cases/update-memory-use-case";
import { DeleteMemoryUseCase } from "@/data/memories/use-cases/delete-memory-use-case";

const statusMap: Record<string, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHENTICATED: 401,
  INTERNAL_ERROR: 500,
};

/**
 * GET handler for single memory details
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ memoryId: string }> },
) {
  await connection();
  const { memoryId } = await params;

  return withAuthenticatedContext(async (ctx) => {
    const uc = new GetMemoryUseCase(ctx.orgId);
    const result = await uc.execute({ memoryId });

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

/**
 * PUT handler for updating a memory
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ memoryId: string }> },
) {
  await connection();
  const { memoryId } = await params;

  return withAuthenticatedContext(async (ctx) => {
    const body = await request.json();

    const uc = new UpdateMemoryUseCase(ctx);
    const result = await uc.execute({ ...body, memoryId });

    if (!result.ok) {
      const status = statusMap[result.error.code] ?? 500;
      return NextResponse.json(
        { error: result.error.code, message: result.error.message },
        { status },
      );
    }

    revalidateTag(memoriesCacheTag(ctx.orgId), "max");
    revalidateTag(memoryDetailCacheTag(ctx.orgId, memoryId), "max");
    return NextResponse.json(result.value.memory);
  }).catch((e: unknown) => {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status =
      message.includes("session") || message.includes("auth") ? 401 : 500;
    const code = status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR";
    return NextResponse.json({ error: code }, { status });
  });
}

/**
 * DELETE handler for removing a memory
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ memoryId: string }> },
) {
  await connection();
  const { memoryId } = await params;

  return withAuthenticatedContext(async (ctx) => {
    const uc = new DeleteMemoryUseCase(ctx);
    const result = await uc.execute({ memoryId });

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
      deletedCount: result.value.deletedDocumentCount,
    });
  }).catch((e: unknown) => {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status =
      message.includes("session") || message.includes("auth") ? 401 : 500;
    const code = status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR";
    return NextResponse.json({ error: code }, { status });
  });
}
