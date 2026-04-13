/**
 * GET /api/memories/[memoryId]/documents/[documentId] — Fetch single document
 * PUT /api/memories/[memoryId]/documents/[documentId] — Update a document
 * DELETE /api/memories/[memoryId]/documents/[documentId] — Delete a document
 */

import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { GetMemoryDocumentUseCase } from "@/data/memories/use-cases/get-memory-document-use-case";
import { UpdateMemoryDocumentUseCase } from "@/data/memories/use-cases/update-memory-document-use-case";
import { DeleteMemoryDocumentUseCase } from "@/data/memories/use-cases/delete-memory-document-use-case";

const statusMap: Record<string, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHENTICATED: 401,
  INTERNAL_ERROR: 500,
};

/**
 * GET handler for single document details
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ memoryId: string; documentId: string }> },
) {
  await connection();
  const { memoryId, documentId } = await params;

  return withAuthenticatedContext(async (ctx) => {
    const uc = new GetMemoryDocumentUseCase(ctx.orgId);
    const result = await uc.execute({ memoryId, documentId });

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
 * PUT handler for updating a document
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ memoryId: string; documentId: string }> },
) {
  await connection();
  const { memoryId, documentId } = await params;

  return withAuthenticatedContext(async (ctx) => {
    const body = await request.json();

    const uc = new UpdateMemoryDocumentUseCase(ctx);
    const result = await uc.execute({ memoryId, documentId, ...body });

    if (!result.ok) {
      const status = statusMap[result.error.code] ?? 500;
      return NextResponse.json(
        { error: result.error.code, message: result.error.message },
        { status },
      );
    }

    return NextResponse.json(result.value.document);
  }).catch((e: unknown) => {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status =
      message.includes("session") || message.includes("auth") ? 401 : 500;
    const code = status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR";
    return NextResponse.json({ error: code }, { status });
  });
}

/**
 * DELETE handler for removing a document
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ memoryId: string; documentId: string }> },
) {
  await connection();
  const { memoryId, documentId } = await params;

  return withAuthenticatedContext(async (ctx) => {
    const uc = new DeleteMemoryDocumentUseCase(ctx);
    const result = await uc.execute({ memoryId, documentId });

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
