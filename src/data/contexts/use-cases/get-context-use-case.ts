import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result } from "@/lib/result";
import {
  GetContextSchema,
  type GetContextInput,
} from "@/data/contexts/dto/context-dto";
import { ContextRepository } from "@/data/contexts/repositories/context-repository";
import type { Context } from "@/data/contexts/models/context.model";

export class GetContextUseCase extends BaseUseCase<GetContextInput, Context> {
  protected schema = GetContextSchema;

  constructor(private readonly orgId: string) {
    super();
  }

  protected async handle(
    input: GetContextInput,
  ): Promise<Result<Context, AppError>> {
    const repo = new ContextRepository(this.orgId);
    return repo.findById(input.contextId);
  }
}
