import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, ok } from "@/lib/result";
import { AuthHttpRepository } from "@/data/auth/repositories/auth-repository";
import { SignOutSchema } from "@/data/auth/dto/sign-out-dto";

export class SignOutUseCase extends BaseUseCase<
  z.infer<typeof SignOutSchema>,
  { ok: true }
> {
  protected schema = SignOutSchema;
  private readonly authRepo = new AuthHttpRepository();

  protected async handle(
    input: z.infer<typeof SignOutSchema>,
  ): Promise<Result<{ ok: true }, AppError>> {
    const { sessionCookie } = input;

    if (sessionCookie) {
      // Decode without revocation check so we still get uid even if already revoked
      const decodedResult = await this.authRepo.decodeToken(sessionCookie);
      if (decodedResult.ok) {
        await this.authRepo.signOut(decodedResult.value.uid);
      }
    }

    return ok({ ok: true });
  }
}
