import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, appError, err, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import {
  type DashboardMetrics,
  type DayBucket,
  GetDashboardMetricsSchema,
} from "@/data/organizations/dto/dashboard-metrics-dto";
import { AuditLogRepository } from "@/data/audit/repositories/audit-log-repository";
import { ApiKeyRepository } from "@/data/organizations/repositories/api-key-repository";
import { StoreRepository } from "@/data/stores/repositories/store-repository";

export type {
  DashboardMetrics,
  DayBucket,
} from "@/data/organizations/dto/dashboard-metrics-dto";

export class GetDashboardMetricsUseCase extends BaseUseCase<
  z.infer<typeof GetDashboardMetricsSchema>,
  DashboardMetrics
> {
  protected schema = GetDashboardMetricsSchema;

  constructor(private readonly ctx: AppContext) {
    super();
  }

  protected async handle(
    input: z.infer<typeof GetDashboardMetricsSchema>,
  ): Promise<Result<DashboardMetrics, AppError>> {
    const { orgId } = this.ctx;
    const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
    const apiKeyRepo = new ApiKeyRepository(orgId);
    const auditRepo = new AuditLogRepository(orgId);
    const storeRepo = new StoreRepository(orgId);

    const [activeKeysResult, activityResult, errorsResult, storesCountResult] =
      await Promise.all([
        apiKeyRepo.countActive(),
        auditRepo.findByEventType("API_KEY_USAGE_SUCCESS", since),
        auditRepo.findByEventType("API_KEY_USAGE_FAILURE", since),
        storeRepo.countByOrg(),
      ]);

    if (!activeKeysResult.ok) {
      return err(appError("INTERNAL_ERROR", "Failed to count active keys"));
    }
    if (!activityResult.ok) {
      return err(appError("INTERNAL_ERROR", "Failed to fetch key activity"));
    }
    if (!errorsResult.ok) {
      return err(appError("INTERNAL_ERROR", "Failed to fetch error activity"));
    }
    if (!storesCountResult.ok) {
      return err(appError("INTERNAL_ERROR", "Failed to count stores"));
    }

    return ok({
      totalActiveKeys: activeKeysResult.value,
      totalStores: storesCountResult.value,
      keyActivity: bucketByDay(activityResult.value.map((e) => e.timestamp)),
      errors: bucketByDay(errorsResult.value.map((e) => e.timestamp)),
    });
  }
}

function bucketByDay(dates: Date[]): DayBucket[] {
  // Create a map of existing data keyed by YYYY-MM-DD
  const dataMap = new Map<string, number>();
  for (const d of dates) {
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    dataMap.set(key, (dataMap.get(key) ?? 0) + 1);
  }

  // Generate all 30 days from 30 days ago to today
  const buckets: DayBucket[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    const count = dataMap.get(dateStr) ?? 0;
    buckets.push({
      date: dateStr,
      count,
    });
  }

  return buckets;
}
