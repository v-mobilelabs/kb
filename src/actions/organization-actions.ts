"use server";

import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { UpdateOrganizationUseCase } from "@/data/organizations/use-cases/update-organization-use-case";
import { CreateApiKeyUseCase } from "@/data/organizations/use-cases/create-api-key-use-case";
import { ListApiKeysUseCase } from "@/data/organizations/use-cases/list-api-keys-use-case";
import { RevokeApiKeyUseCase } from "@/data/organizations/use-cases/revoke-api-key-use-case";
import type { Result, AppError } from "@/lib/result";

export async function updateOrganizationAction(
  rawInput: unknown,
): Promise<Result<{ name: string }, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new UpdateOrganizationUseCase(ctx);
    return uc.execute(rawInput);
  });
}

export async function createApiKeyAction(rawInput: unknown): Promise<
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
  return withAuthenticatedContext(async (ctx) => {
    const uc = new CreateApiKeyUseCase(ctx);
    return uc.execute(rawInput);
  });
}

export async function listApiKeysAction(): Promise<
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
  return withAuthenticatedContext(async (ctx) => {
    const uc = new ListApiKeysUseCase(ctx);
    return uc.execute({});
  });
}

export async function revokeApiKeyAction(
  rawInput: unknown,
): Promise<Result<{ revoked: true }, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new RevokeApiKeyUseCase(ctx);
    return uc.execute(rawInput);
  });
}
