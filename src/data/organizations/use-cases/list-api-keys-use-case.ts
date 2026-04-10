import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { GetDashboardMetricsSchema } from "@/data/organizations/dto/dashboard-metrics-dto";
import { ApiKeyRepository } from "@/data/organizations/repositories/api-key-repository";

export class ListApiKeysUseCase extends BaseUseCase<
  z.infer<typeof GetDashboardMetricsSchema>,
  {
    keys: {
      id: string;
      name: string;
      maskedKey: string;
      createdAt: string;
      lastUsedAt: string | null;
    }[];
  }
> {
  protected schema = GetDashboardMetricsSchema;

  constructor(private ctx: AppContext) {
    super();
  }

  protected async handle(
    _input: z.infer<typeof GetDashboardMetricsSchema>,
  ): Promise<
    Result<
      {
        keys: {
          id: string;
          name: string;
          maskedKey: string;
          createdAt: string;
          lastUsedAt: string | null;
        }[];
      },
      AppError
    >
  > {
    const { orgId } = this.ctx;
    const keyRepo = new ApiKeyRepository(orgId);

    const result = await keyRepo.findAll({
      filters: [
        { field: "orgId", op: "==", value: orgId },
        { field: "isRevoked", op: "==", value: false },
      ],
      orderBy: { field: "createdAt", direction: "desc" },
    });

    if (!result.ok) return result;

    return ok({
      keys: result.value.map((k) => ({
        id: k.id,
        name: k.name,
        maskedKey: k.maskedKey,
        createdAt: k.createdAt.toISOString(),
        lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
      })),
    });
  }
}
