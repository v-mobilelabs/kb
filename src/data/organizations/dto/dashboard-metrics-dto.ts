import { z } from "zod";

export const GetDashboardMetricsSchema = z.object({
  /** Lookback window in days. Defaults to 30. Max 365. */
  days: z.number().int().min(1).max(365).default(30),
});

export type GetDashboardMetricsDto = z.infer<typeof GetDashboardMetricsSchema>;

// ── Output schemas ────────────────────────────────────────────────────────────

export const DayBucketSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  count: z.number().int().min(0),
});

export const DashboardMetricsSchema = z.object({
  totalActiveKeys: z.number().int().min(0),
  totalStores: z.number().int().min(0),
  totalFiles: z.number().int().min(0),
  totalContexts: z.number().int().min(0),
  totalMembers: z.number().int().min(0),
  keyActivity: z.array(DayBucketSchema),
  errors: z.array(DayBucketSchema),
});

export type DayBucket = z.infer<typeof DayBucketSchema>;
export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;
