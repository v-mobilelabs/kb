import {
  Timestamp,
  FieldValue,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase-admin/firestore";
import { AbstractFirebaseRepository } from "@/lib/abstractions/abstract-firebase-repository";
import { ok, err, appError, type Result, type AppError } from "@/lib/result";
import type {
  DeletionTask,
  DeletionTaskStatus,
} from "@/data/organizations/models/deletion-task.model";

export class DeletionTaskRepository extends AbstractFirebaseRepository<DeletionTask> {
  protected get collectionPath() {
    return "deletionTasks";
  }

  protected fromFirestore(
    snap: QueryDocumentSnapshot<DocumentData>,
  ): DeletionTask {
    const d = snap.data();
    return {
      id: snap.id,
      orgId: d.orgId as string,
      userId: d.userId as string,
      status: d.status as DeletionTaskStatus,
      retryCount: (d.retryCount as number) ?? 0,
      scheduledDeleteAt:
        d.scheduledDeleteAt instanceof Timestamp
          ? d.scheduledDeleteAt.toDate()
          : new Date(d.scheduledDeleteAt as string),
      startedAt: d.startedAt instanceof Timestamp
        ? d.startedAt.toDate()
        : d.startedAt
          ? new Date(d.startedAt as string)
          : null,
      completedAt: d.completedAt instanceof Timestamp
        ? d.completedAt.toDate()
        : d.completedAt
          ? new Date(d.completedAt as string)
          : null,
      errorMessage: (d.errorMessage as string | null) ?? null,
      deletedEntityCount: (d.deletedEntityCount as number | null) ?? null,
      createdAt:
        d.createdAt instanceof Timestamp
          ? d.createdAt.toDate()
          : new Date(d.createdAt as string),
      updatedAt:
        d.updatedAt instanceof Timestamp
          ? d.updatedAt.toDate()
          : new Date(d.updatedAt as string),
    };
  }

  async createTask(
    task: Omit<DeletionTask, "id" | "createdAt" | "updatedAt">,
  ): Promise<Result<DeletionTask, AppError>> {
    try {
      const ref = this.collection().doc();
      const now = FieldValue.serverTimestamp();
      await ref.set({
        ...task,
        scheduledDeleteAt: Timestamp.fromDate(task.scheduledDeleteAt),
        createdAt: now,
        updatedAt: now,
      });
      const snap = await ref.get();
      return ok(this.fromFirestore(snap as QueryDocumentSnapshot<DocumentData>));
    } catch (e) {
      return err(appError("INTERNAL_ERROR", (e as Error).message));
    }
  }

  /** Find the active pending task for a specific user in an org (at most one) */
  async findActivePendingByUser(
    orgId: string,
    userId: string,
  ): Promise<Result<DeletionTask | null, AppError>> {
    try {
      const snap = await this.collection()
        .where("orgId", "==", orgId)
        .where("userId", "==", userId)
        .where("status", "in", ["pending", "in_progress"])
        .limit(1)
        .get();
      if (snap.empty) return ok(null);
      return ok(this.fromFirestore(snap.docs[0]!));
    } catch (e) {
      return err(appError("INTERNAL_ERROR", (e as Error).message));
    }
  }

  async cancel(taskId: string): Promise<Result<void, AppError>> {
    try {
      await this.collection().doc(taskId).update({
        status: "cancelled" satisfies DeletionTaskStatus,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return ok(undefined);
    } catch (e) {
      return err(appError("INTERNAL_ERROR", (e as Error).message));
    }
  }

  async updateStatus(
    taskId: string,
    status: DeletionTaskStatus,
    extra?: {
      startedAt?: Date;
      completedAt?: Date;
      errorMessage?: string | null;
      deletedEntityCount?: number;
    },
  ): Promise<Result<void, AppError>> {
    try {
      const payload: Record<string, unknown> = {
        status,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (extra?.startedAt) payload.startedAt = Timestamp.fromDate(extra.startedAt);
      if (extra?.completedAt)
        payload.completedAt = Timestamp.fromDate(extra.completedAt);
      if (extra?.errorMessage !== undefined)
        payload.errorMessage = extra.errorMessage;
      if (extra?.deletedEntityCount !== undefined)
        payload.deletedEntityCount = extra.deletedEntityCount;
      await this.collection().doc(taskId).update(payload);
      return ok(undefined);
    } catch (e) {
      return err(appError("INTERNAL_ERROR", (e as Error).message));
    }
  }
}
