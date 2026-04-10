import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, appError, err, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import {
  GetStoreMonitoringSchema,
  type StoreMonitoringMetrics,
  type EnrichmentStats,
  type ActivityEvent,
} from "@/data/stores/dto/store-monitoring-dto";
import { StoreRepository } from "@/data/stores/repositories/store-repository";
import { StoreDocumentRepository } from "@/data/stores/repositories/store-document-repository";
import type { StoreDocument } from "@/data/stores/models/store-document.model";

const STATUS_ACTION_MAP: Record<string, string> = {
  completed: "enriched",
  failed: "failed",
  processing: "processing",
};

function toActivityEvent(doc: StoreDocument): ActivityEvent {
  const status = doc.status;
  const action = STATUS_ACTION_MAP[status] ?? "added";
  return {
    id: doc.id,
    documentId: doc.id,
    name: doc.name,
    action,
    status,
    timestamp: doc.updatedAt,
    error: doc.error ?? undefined,
  };
}

export class GetStoreMonitoringUseCase extends BaseUseCase<
  z.infer<typeof GetStoreMonitoringSchema>,
  StoreMonitoringMetrics
> {
  protected schema = GetStoreMonitoringSchema;

  constructor(private readonly ctx: AppContext) {
    super();
  }

  protected async handle(
    input: z.infer<typeof GetStoreMonitoringSchema>,
  ): Promise<Result<StoreMonitoringMetrics, AppError>> {
    const storeRepo = new StoreRepository(this.ctx.orgId);
    const storeResult = await storeRepo.findById(input.storeId);
    if (!storeResult.ok) return err(storeResult.error);
    if (storeResult.value.orgId !== this.ctx.orgId) {
      return err(
        appError("FORBIDDEN", "Store does not belong to your organization"),
      );
    }

    const store = storeResult.value;
    const docRepo = new StoreDocumentRepository(this.ctx.orgId, input.storeId);

    // Run all queries in parallel via repository methods
    const [statusResult, recentResult] = await Promise.all([
      docRepo.countByStatus(),
      docRepo.findRecentlyUpdated(100),
    ]);

    if (!statusResult.ok) return err(statusResult.error);
    if (!recentResult.ok) return err(recentResult.error);

    const counts = statusResult.value;
    const recentDocs = recentResult.value;

    // Enrichment statsxx
    const enrichment: EnrichmentStats = {
      pending: counts.pending,
      processing: counts.processing,
      completed: counts.completed,
      failed: counts.failed,
    };

    // Total size + recent activity
    let totalSizeBytes = 0;
    const recentActivity: ActivityEvent[] = [];

    for (const doc of recentDocs) {
      if (doc.kind === "file") {
        totalSizeBytes += doc.sizeBytes;
      }

      if (recentActivity.length < 20) {
        recentActivity.push(toActivityEvent(doc));
      }
    }

    return ok({
      enrichment,
      totalSizeBytes,
      recentActivity,
      lastUpdated: store.updatedAt.toISOString(),
    });
  }
}
