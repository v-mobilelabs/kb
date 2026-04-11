import { z } from "zod";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, appError, err, ok } from "@/lib/result";
import { AuditLogRepository } from "@/data/audit/repositories/audit-log-repository";

export const CheckRateLimitSchema = z.object({
  orgId: z.string(),
  actorEmail: z.string().email(),
  eventType: z.enum([
    "MAGIC_LINK_REQUEST",
    "MAGIC_LINK_REDEEMED",
    "API_KEY_CREATED",
    "API_KEY_REVOKED",
    "ACCOUNT_DELETED",
    "API_KEY_USAGE_SUCCESS",
    "API_KEY_USAGE_FAILURE",
    "STORE_CREATED",
    "STORE_UPDATED",
    "STORE_DELETED",
  ]),
  windowMs: z.number().positive(),
  max: z.number().positive().int(),
});

export type CheckRateLimitDTO = z.infer<typeof CheckRateLimitSchema>;

export interface RateLimitCheckResult {
  isLimited: boolean;
  count: number;
  max: number;
  actorEmail: string;
  eventType: string;
}

export class CheckRateLimitUseCase extends BaseUseCase<
  CheckRateLimitDTO,
  RateLimitCheckResult
> {
  protected schema = CheckRateLimitSchema;

  protected auditDescriptor(
    input: CheckRateLimitDTO,
    result: Result<RateLimitCheckResult, AppError>,
  ): AuditDescriptor | null {
    // Only audit rate limit exceeded failures
    if (result.ok || result.error.code !== "RATE_LIMIT_EXCEEDED") {
      return null;
    }

    return {
      eventType: input.eventType,
      actorEmail: input.actorEmail,
      actorUid: null,
      orgId: null,
      reason: "Rate limit exceeded",
    };
  }

  protected async handle(
    input: CheckRateLimitDTO,
  ): Promise<Result<RateLimitCheckResult, AppError>> {
    const since = new Date(Date.now() - input.windowMs);

    // Query audit log to count events within the time window
    const auditRepo = new AuditLogRepository();
    const countResult = await auditRepo.count([
      { field: "actorEmail", op: "==", value: input.actorEmail },
      { field: "eventType", op: "==", value: input.eventType },
      { field: "timestamp", op: ">=", value: since },
      { field: "orgId", op: "==", value: input.orgId },
    ]);

    if (!countResult.ok) {
      return err(countResult.error);
    }

    const count = countResult.value;
    const isLimited = count >= input.max;

    // If rate limit exceeded, return error (will be audited by auditDescriptor)
    if (isLimited) {
      return err(
        appError("RATE_LIMIT_EXCEEDED", "Too many requests. Try again later."),
      );
    }

    return ok({
      isLimited: false,
      count,
      max: input.max,
      actorEmail: input.actorEmail,
      eventType: input.eventType,
    });
  }
}
