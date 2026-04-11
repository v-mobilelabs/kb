import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result } from "@/lib/result";
import { AuditLogRepository } from "@/data/audit/repositories/audit-log-repository";
import {
  CreateAuditLogSchema,
  type CreateAuditLogDTO,
} from "@/data/audit/dto/audit-dto";

export class CreateAuditLogUseCase extends BaseUseCase<
  CreateAuditLogDTO,
  { id: string }
> {
  protected schema = CreateAuditLogSchema;

  protected auditDescriptor(): AuditDescriptor | null {
    // Don't audit the audit logging itself to avoid recursion
    return null;
  }

  protected async handle(
    input: CreateAuditLogDTO,
  ): Promise<Result<{ id: string }, AppError>> {
    // Validate orgId is provided
    if (!input.orgId) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Organization ID is required for audit logging",
        },
      };
    }
    const auditRepo = new AuditLogRepository();
    const result = await auditRepo.create(input);
    return result;
  }
}
