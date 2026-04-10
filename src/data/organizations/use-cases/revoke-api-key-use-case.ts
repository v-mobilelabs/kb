import { z } from "zod";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, appError, err, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { ApiKeySchema } from "@/data/organizations/dto/api-key-dto";
import { ApiKeyRepository } from "@/data/organizations/repositories/api-key-repository";
import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { CacheRepository } from "@/data/organizations/repositories/cache-repository";

export class RevokeApiKeyUseCase extends BaseUseCase<
  z.infer<typeof ApiKeySchema>,
  { revoked: true }
> {
  protected schema = ApiKeySchema;

  constructor(private readonly ctx: AppContext) {
    super();
  }

  protected auditDescriptor(): AuditDescriptor {
    return {
      eventType: "API_KEY_REVOKED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: null,
    };
  }

  protected async handle(
    input: z.infer<typeof ApiKeySchema>,
  ): Promise<Result<{ revoked: true }, AppError>> {
    const { orgId } = this.ctx;
    const keyRepo = new ApiKeyRepository(orgId);

    const keyResult = await keyRepo.findById(input.keyId);
    if (!keyResult.ok) {
      return err(
        appError("NOT_FOUND", "API key not found or belongs to another org"),
      );
    }

    // Org isolation check
    if (keyResult.value.orgId !== orgId) {
      return err(
        appError("FORBIDDEN", "API key does not belong to your organization"),
      );
    }

    // Idempotency guard
    if (keyResult.value.isRevoked) {
      return ok({ revoked: true });
    }

    const keyValue = keyResult.value.key;

    await adminDb
      .collection("api_keys")
      .doc(input.keyId)
      .update({ isRevoked: true, revokedAt: Timestamp.fromDate(new Date()) });

    // Remove from RTDB cache so middleware immediately rejects the key
    const cache = new CacheRepository();
    await cache.remove(keyValue);

    return ok({ revoked: true });
  }
}
