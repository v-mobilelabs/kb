export type DeletionTaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";

export interface DeletionTask {
  id: string;
  orgId: string;
  userId: string;
  status: DeletionTaskStatus;
  retryCount: number; // max 3
  scheduledDeleteAt: Date; // removedAt + gracePeriodDays
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  deletedEntityCount: number | null; // set on completion
  createdAt: Date;
  updatedAt: Date;
}
