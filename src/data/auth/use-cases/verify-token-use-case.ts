import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, ok } from "@/lib/result";
import { AuthHttpRepository } from "@/data/auth/repositories/auth-repository";
import { VerifyTokenSchema } from "@/data/auth/dto/verify-token-dto";

export class VerifyTokenUseCase extends BaseUseCase<
  z.infer<typeof VerifyTokenSchema>,
  { uid: string; email: string; orgId: string | null }
> {
  protected schema = VerifyTokenSchema;
  private readonly authRepo = new AuthHttpRepository();

  protected async handle(
    input: z.infer<typeof VerifyTokenSchema>,
  ): Promise<
    Result<{ uid: string; email: string; orgId: string | null }, AppError>
  > {
    const result = await this.authRepo.verifyToken(input.sessionCookie);
    if (!result.ok) return result;

    const decoded = result.value;
    const orgId = (decoded.orgId as string | undefined) ?? null;

    return ok({
      uid: decoded.uid,
      email: decoded.email ?? "",
      orgId,
    });
  }
}
