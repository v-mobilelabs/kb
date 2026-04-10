import { z } from "zod";
import {
  BaseUseCase,
  type AuditDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { CreateApiKeySchema } from "@/data/organizations/dto/create-api-key-dto";
import { ApiKeyRepository } from "@/data/organizations/repositories/api-key-repository";
import { CacheRepository } from "@/data/organizations/repositories/cache-repository";

function generateApiKey(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const suffix = Array.from(randomBytes)
    .map((b) => chars[b % chars.length])
    .join("");
  return `cmo_${suffix}`;
}

function maskKey(key: string): string {
  return `cmo_...${key.slice(-4)}`;
}

export class CreateApiKeyUseCase extends BaseUseCase<
  z.infer<typeof CreateApiKeySchema>,
  {
    id: string;
    name: string;
    key: string;
    maskedKey: string;
    createdAt: string;
  }
> {
  protected schema = CreateApiKeySchema;

  constructor(private readonly ctx: AppContext) {
    super();
  }

  protected auditDescriptor(): AuditDescriptor {
    return {
      eventType: "API_KEY_CREATED",
      actorUid: this.ctx.uid,
      actorEmail: this.ctx.email,
      orgId: this.ctx.orgId,
      reason: null,
    };
  }

  protected async handle(input: z.infer<typeof CreateApiKeySchema>): Promise<
    Result<
      {
        id: string;
        name: string;
        key: string;
        maskedKey: string;
        createdAt: string;
      },
      AppError
    >
  > {
    const { orgId } = this.ctx;
    const keyRepo = new ApiKeyRepository(orgId);
    const key = generateApiKey();
    const maskedKey = maskKey(key);
    const now = new Date();

    const created = await keyRepo.create({
      orgId,
      name: input.name,
      key,
      maskedKey,
      isRevoked: false,
      revokedAt: null,
      createdAt: now,
      lastUsedAt: null,
    });

    if (!created.ok) return created;

    // Cache in RTDB for fast middleware lookups
    const cache = new CacheRepository();
    await cache.set(created.value.key, { orgId, apiKeyId: created.value.id });

    return ok({
      id: created.value.id,
      name: created.value.name,
      key: created.value.key,
      maskedKey: created.value.maskedKey,
      createdAt: now.toISOString(),
    });
  }
}
