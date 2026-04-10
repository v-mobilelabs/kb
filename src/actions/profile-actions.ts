"use server";

import { cookies } from "next/headers";
import { withAuthenticatedContext } from "@/lib/middleware/with-context";
import { UpdateDisplayNameUseCase } from "@/data/auth/use-cases/update-display-name-use-case";
import { DeleteAccountUseCase } from "@/data/auth/use-cases/delete-account-use-case";
import type { Result, AppError } from "@/lib/result";

export async function updateDisplayNameAction(
  rawInput: unknown,
): Promise<Result<{ displayName: string }, AppError>> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new UpdateDisplayNameUseCase(ctx);
    return uc.execute(rawInput);
  });
}

export async function deleteAccountAction(): Promise<
  Result<{ deleted: true }, AppError>
> {
  return withAuthenticatedContext(async (ctx) => {
    const uc = new DeleteAccountUseCase(ctx);
    const result = await uc.execute({});

    if (result.ok) {
      // Clear session cookie
      const cookieStore = await cookies();
      cookieStore.delete("session");
    }

    return result;
  });
}
