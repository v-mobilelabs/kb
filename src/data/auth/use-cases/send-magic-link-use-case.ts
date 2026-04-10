import { z } from "zod";
import {
  BaseUseCase,
  type AuditDescriptor,
  type RateLimitDescriptor,
} from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, ok } from "@/lib/result";
import { AuthHttpRepository } from "@/data/auth/repositories/auth-repository";
import { SendMagicLinkSchema } from "@/data/auth/dto/send-magic-link-dto";

export class SendMagicLinkUseCase extends BaseUseCase<
  z.infer<typeof SendMagicLinkSchema>,
  { sent: true }
> {
  protected schema = SendMagicLinkSchema;
  private readonly authRepo = new AuthHttpRepository();

  protected rateLimitDescriptor(
    input: z.infer<typeof SendMagicLinkSchema>,
  ): RateLimitDescriptor {
    return {
      orgId: "_system",
      actorEmail: input.email,
      eventType: "MAGIC_LINK_REQUEST",
      max: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
    };
  }

  protected auditDescriptor(
    input: z.infer<typeof SendMagicLinkSchema>,
    result: Result<{ sent: true }, AppError>,
  ): AuditDescriptor {
    return {
      eventType: "MAGIC_LINK_REQUEST",
      actorUid: null,
      actorEmail: input.email,
      orgId: "_system",
      reason: result.ok ? null : result.error.message,
    };
  }

  protected async handle(
    input: z.infer<typeof SendMagicLinkSchema>,
  ): Promise<Result<{ sent: true }, AppError>> {
    const { email, captchaToken } = input;

    const captchaResult = await this.authRepo.verifyCaptcha(captchaToken);
    if (!captchaResult.ok) return captchaResult;

    const callbackUrl = process.env.NEXT_PUBLIC_BASE_URL + "auth/verify";
    const oobResult = await this.authRepo.sendMagicLink(email, callbackUrl);
    if (!oobResult.ok) return oobResult;

    return ok({ sent: true });
  }
}
