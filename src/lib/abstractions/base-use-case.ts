import { trace, SpanStatusCode } from "@opentelemetry/api";
import type { ZodType } from "zod";
import { type AppError, type Result, appError, err } from "@/lib/result";
import type { AuditEventType } from "@/data/audit/models/audit-log-entry.model";

export interface AuditDescriptor {
  eventType: AuditEventType;
  actorUid: string | null;
  actorEmail: string | null;
  orgId: string | null;
  reason: string | null;
}

export interface RateLimitDescriptor {
  /** Organization ID for scoped audit checking. Use "_system" for global auth events. */
  orgId: string;
  /** Audit log field value to count against (typically the actor's email). */
  actorEmail: string;
  /** Only count audit entries of this event type. */
  eventType: AuditEventType;
  /** Maximum allowed calls within the window. */
  max: number;
  /** Rolling window duration in milliseconds. */
  windowMs: number;
}

const tracer = trace.getTracer("cosmoops");

export abstract class BaseUseCase<TInput, TOutput> {
  protected abstract schema: ZodType<TInput>;

  protected abstract handle(input: TInput): Promise<Result<TOutput, AppError>>;

  /**
   * Override to enable automatic audit logging after handle() resolves.
   * `outcome` and `timestamp` are filled in automatically from the result.
   * Return null to skip auditing for a particular call.
   */
  protected auditDescriptor?(
    input: TInput,
    result: Result<TOutput, AppError>,
  ): AuditDescriptor | null;

  /**
   * Override to enforce a sliding-window rate limit before handle() runs.
   * Uses the audit log to count past calls within the window.
   * Return null to skip rate limiting.
   */
  protected rateLimitDescriptor?(input: TInput): RateLimitDescriptor | null;

  private async _auditEvent(
    descriptor: AuditDescriptor,
    outcome: "success" | "failure",
  ): Promise<void> {
    // Use dynamic import to avoid circular dependency
    const { CreateAuditLogUseCase } =
      await import("@/data/audit/use-cases/create-audit-log-use-case");

    const auditUseCase = new CreateAuditLogUseCase();
    await auditUseCase.execute({
      ...descriptor,
      outcome,
      timestamp: new Date(),
    });
  }

  private async _checkRateLimit(
    input: TInput,
  ): Promise<Result<null, AppError> | null> {
    if (!this.rateLimitDescriptor) return null;
    const rl = this.rateLimitDescriptor(input);
    if (!rl) return null;

    // Use dynamic import to avoid circular dependency
    const { CheckRateLimitUseCase } =
      await import("@/data/audit/use-cases/check-rate-limit-use-case");

    const rateLimitUseCase = new CheckRateLimitUseCase();
    const checkResult = await rateLimitUseCase.execute({
      orgId: rl.orgId,
      actorEmail: rl.actorEmail,
      eventType: rl.eventType,
      windowMs: rl.windowMs,
      max: rl.max,
    });

    // If rate limit check failed, return the error
    // (audit logging is handled by CheckRateLimitUseCase)
    if (!checkResult.ok) {
      return err(checkResult.error);
    }

    return null;
  }

  private async _writeAudit(
    input: TInput,
    result: Result<TOutput, AppError>,
  ): Promise<void> {
    if (!this.auditDescriptor) return;
    const descriptor = this.auditDescriptor(input, result);
    if (!descriptor) return;
    await this._auditEvent(descriptor, result.ok ? "success" : "failure");
  }

  async execute(rawInput: unknown): Promise<Result<TOutput, AppError>> {
    const spanName = this.constructor.name;
    return tracer.startActiveSpan(spanName, async (span) => {
      const parsed = this.schema.safeParse(rawInput);
      if (!parsed.success) {
        const message = parsed.error.issues.map((e) => e.message).join(", ");
        span.setStatus({ code: SpanStatusCode.ERROR, message });
        span.end();
        return err(appError("VALIDATION_ERROR", message, parsed.error));
      }

      const rateLimitError = await this._checkRateLimit(parsed.data);
      if (rateLimitError) {
        span.end();
        return rateLimitError as Result<TOutput, AppError>;
      }

      const result = await this.handle(parsed.data);
      await this._writeAudit(parsed.data, result);

      if (result.ok) {
        span.setStatus({ code: SpanStatusCode.OK });
      } else {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: result.error.message,
        });
      }
      span.end();
      return result;
    });
  }
}
