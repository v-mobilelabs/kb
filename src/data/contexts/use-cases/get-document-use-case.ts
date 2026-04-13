import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result } from "@/lib/result";
import {
  GetDocumentSchema,
  type GetDocumentInput,
} from "@/data/contexts/dto/context-dto";
import { ContextDocumentRepository } from "@/data/contexts/repositories/context-document-repository";
import type { ContextDocument } from "@/data/contexts/models/context-document.model";

export class GetDocumentUseCase extends BaseUseCase<
  GetDocumentInput,
  ContextDocument
> {
  protected schema = GetDocumentSchema;
  private readonly docRepo = new ContextDocumentRepository();

  protected async handle(
    input: GetDocumentInput,
  ): Promise<Result<ContextDocument, AppError>> {
    return this.docRepo.findById(input.orgId, input.contextId, input.docId);
  }
}
