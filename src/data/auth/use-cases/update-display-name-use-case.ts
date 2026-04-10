import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { UpdateDisplayNameSchema } from "@/data/auth/dto/update-display-name-dto";
import { UserProfileRepository } from "@/data/auth/repositories/user-profile-repository";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

export class UpdateDisplayNameUseCase extends BaseUseCase<
  z.infer<typeof UpdateDisplayNameSchema>,
  { displayName: string }
> {
  protected schema = UpdateDisplayNameSchema;
  private profileRepo = new UserProfileRepository();

  constructor(private ctx: AppContext) {
    super();
  }

  protected async handle(
    input: z.infer<typeof UpdateDisplayNameSchema>,
  ): Promise<Result<{ displayName: string }, AppError>> {
    const { uid } = this.ctx;
    const now = Timestamp.fromDate(new Date());
    await adminDb
      .collection("profiles")
      .doc(uid)
      .update({ displayName: input.displayName, updatedAt: now });
    return ok({ displayName: input.displayName });
  }
}
