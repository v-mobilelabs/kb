import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, appError, err, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import type { ActivityEvent } from "@/data/stores/dto/store-monitoring-dto";
import { StoreRepository } from "@/data/stores/repositories/store-repository";
import { StoreDocumentRepository } from "@/data/stores/repositories/store-document-repository";
import type { StoreDocument } from "@/data/stores/models/store-document.model";

const STATUS_ACTION_MAP: Record<string, string> = {
  completed: "enriched",
  failed: "failed",
  processing: "processing",
};

/** Maps document (Firestore) status → display status shown in the UI. */
const DOC_TO_DISPLAY_STATUS: Record<string, string> = {
  completed: "enriched",
  failed: "failed",
  processing: "processing",
  pending: "added",
};

/** Maps the display status the user filters by → raw document status for Firestore. */
const DISPLAY_TO_DOC_STATUS: Record<string, string> = {
  enriched: "completed",
  failed: "failed",
  processing: "processing",
  added: "pending",
};

function toActivityEvent(doc: StoreDocument): ActivityEvent {
  const action = STATUS_ACTION_MAP[doc.status] ?? "added";
  const displayStatus = DOC_TO_DISPLAY_STATUS[doc.status] ?? "added";
  return {
    id: doc.id,
    documentId: doc.id,
    name: doc.name,
    action,
    status: displayStatus,
    timestamp: doc.updatedAt,
    error: doc.error ?? undefined,
  };
}

const InputSchema = z.object({
  storeId: z.string().min(1),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  status: z.enum(["enriched", "failed", "processing", "added"]).optional(),
});

type Input = z.infer<typeof InputSchema>;

export interface ActivityPage {
  items: ActivityEvent[];
  total: number;
  page: number;
  limit: number;
}

export class ListStoreActivityUseCase extends BaseUseCase<Input, ActivityPage> {
  protected schema = InputSchema;

  constructor(private readonly ctx: Required<AppContext>) {
    super();
  }

  protected async handle(
    input: Input,
  ): Promise<Result<ActivityPage, AppError>> {
    const storeRepo = new StoreRepository(this.ctx.orgId);
    const storeResult = await storeRepo.findById(input.storeId);
    if (!storeResult.ok) return err(storeResult.error);
    if (storeResult.value.orgId !== this.ctx.orgId) {
      return err(
        appError("FORBIDDEN", "Store does not belong to your organization"),
      );
    }

    const docRepo = new StoreDocumentRepository(this.ctx.orgId, input.storeId);
    const offset = (input.page - 1) * input.limit;
    const docStatus = input.status
      ? DISPLAY_TO_DOC_STATUS[input.status]
      : undefined;
    const result = await docRepo.findRecentlyUpdatedPaginated({
      offset,
      limit: input.limit,
      status: docStatus,
    });
    if (!result.ok) return err(result.error);

    return ok({
      items: result.value.items.map(toActivityEvent),
      total: result.value.total,
      page: input.page,
      limit: input.limit,
    });
  }
}
