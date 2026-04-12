import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { MemoryDocumentRepository } from "@/data/memories/repositories/memory-document-repository";
import { UpdateMemoryDocumentSchema } from "@/data/memories/schemas";
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
  { params }: { params: Promise<{ memoryId: string; documentId: string }> },
) {
  await connection();
  const { memoryId, documentId } = await params;

  return withAuthenticatedContext(async (ctx) => {
    const repo = new MemoryDocumentRepository(ctx.orgId, memoryId);
    const result = await repo.findById(documentId);

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
  { params }: { params: Promise<{ memoryId: string; documentId: string }> },
) {
  await connection();
  const { memoryId, documentId } = await params;

  return withAuthenticatedContext(async (ctx) => {
    const body = await request.json();
    const parsed = UpdateMemoryDocumentSchema.safeParse({
      ...body,
      documentId,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: parsed.error.message },
        { status: 400 },
      );
    }

    const repo = new MemoryDocumentRepository(ctx.orgId, memoryId);

    const updates: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.content !== undefined)
      updates.content = parsed.data.content;

    const updateResult = await repo.update(documentId, updates);
    if (!updateResult.ok) {
      const status = statusMap[updateResult.error.code] ?? 500;
      return NextResponse.json(
        {
          error: updateResult.error.code,
          message: updateResult.error.message,
        },
        { status },
      );
    }

    const refreshed = await repo.findById(documentId);
    if (!refreshed.ok) {
      return NextResponse.json(
        { error: refreshed.error.code, message: refreshed.error.message },
        { status: 500 },
      );
    }

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
  { params }: { params: Promise<{ memoryId: string; documentId: string }> },
) {
  await connection();
  const { memoryId, documentId } = await params;

  return withAuthenticatedContext(async (ctx) => {
    const repo = new MemoryDocumentRepository(ctx.orgId, memoryId);
    const result = await repo.deleteWithDecrement(documentId);

    if (!result.ok) {
      const status = statusMap[result.error.code] ?? 500;
      return NextResponse.json(
        { error: result.error.code, message: result.error.message },
        { status },
      );
    }

    return NextResponse.json({ success: true });
  }).catch((e: unknown) => {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status =
      message.includes("session") || message.includes("auth") ? 401 : 500;
    const code = status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR";
    return NextResponse.json({ error: code }, { status });
  });
}
