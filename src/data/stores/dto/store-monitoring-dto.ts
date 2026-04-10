import { z } from "zod";

export const GetStoreMonitoringSchema = z.object({
  storeId: z.string().min(1),
});

// ── Output types ──────────────────────────────────────────────────────────────

export interface EnrichmentStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface ActivityEvent {
  id: string;
  documentId: string;
  name: string;
  action: string;
  status: string;
  timestamp: string;
  error?: string;
}

export interface StoreMonitoringMetrics {
  /** Document counts by enrichment status */
  enrichment: EnrichmentStats;
  /** Total storage size in bytes (file documents) */
  totalSizeBytes: number;
  /** Recent activity timeline (last 20 events) */
  recentActivity: ActivityEvent[];
  /** Store last updated */
  lastUpdated: string;
}
