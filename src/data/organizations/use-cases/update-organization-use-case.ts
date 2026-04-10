import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, ok } from "@/lib/result";
import { type AppContext } from "@/lib/middleware/with-context";
import { UpdateOrganizationSchema } from "@/data/organizations/dto/update-organization-dto";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

export class UpdateOrganizationUseCase extends BaseUseCase<
  z.infer<typeof UpdateOrganizationSchema>,
  { name: string }
> {
  protected schema = UpdateOrganizationSchema;

  constructor(private ctx: AppContext) {
    super();
  }

  protected async handle(
    input: z.infer<typeof UpdateOrganizationSchema>,
  ): Promise<Result<{ name: string }, AppError>> {
    const { orgId } = this.ctx;
    await adminDb
      .collection("organizations")
      .doc(orgId)
      .update({ name: input.name, updatedAt: Timestamp.fromDate(new Date()) });
    return ok({ name: input.name });
  }
}
