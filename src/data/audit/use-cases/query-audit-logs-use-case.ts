import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, ok } from "@/lib/result";
import { AuditLogRepository } from "@/data/audit/repositories/audit-log-repository";
import {
  QueryAuditLogsSchema,
  type QueryAuditLogsDTO,
} from "@/data/audit/dto/audit-dto";
import type { AuditLogEntry } from "@/data/audit/models/audit-log-entry.model";

export class QueryAuditLogsUseCase extends BaseUseCase<
  QueryAuditLogsDTO,
  { logs: AuditLogEntry[] }
> {
  protected schema = QueryAuditLogsSchema;

  protected auditDescriptor(): AuditDescriptor | null {
    // Don't audit read-only query operations
    return null;
  }

  protected async handle(
    input: QueryAuditLogsDTO,
  ): Promise<Result<{ logs: AuditLogEntry[] }, AppError>> {
    const auditRepo = new AuditLogRepository(input.orgId ?? "_system");
    const result = await auditRepo.findByEventType(
      input.eventType,
      input.since,
    );
    return result.ok ? ok({ logs: result.value }) : result;
  }
}
