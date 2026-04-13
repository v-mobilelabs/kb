import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result } from "@/lib/result";
import {
  ListDocumentsSchema,
  type ListDocumentsInput,
} from "@/data/contexts/dto/context-dto";
import {
  ContextDocumentRepository,
  type PaginatedDocumentResult,
} from "@/data/contexts/repositories/context-document-repository";

export class ListDocumentsUseCase extends BaseUseCase<
  ListDocumentsInput,
  PaginatedDocumentResult
> {
  protected schema = ListDocumentsSchema;
  private readonly docRepo = new ContextDocumentRepository();

  protected async handle(
    input: ListDocumentsInput,
  ): Promise<Result<PaginatedDocumentResult, AppError>> {
    return this.docRepo.list(input.orgId, input.contextId, {
      sort: input.sort,
      cursor: input.cursor,
      limit: input.limit,
      filterId: input.filterId,
    });
  }
}
