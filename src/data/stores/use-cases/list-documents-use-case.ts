import { z } from "zod";
import { BaseUseCase } from "@/lib/abstractions/base-use-case";
import { type AppError, type Result, appError, err } from "@/lib/result";
import { DocumentListQuerySchema } from "@/data/stores/dto/store-query-dto";
import {
  StoreDocumentRepository,
  type PaginatedResult,
} from "@/data/stores/repositories/store-document-repository";
import { StoreRepository } from "@/data/stores/repositories/store-repository";
import type { StoreDocument } from "@/data/stores/models/store-document.model";

const ListDocumentsInputSchema = DocumentListQuerySchema.extend({
  storeId: z.string().min(1),
});

type ListDocumentsInput = z.infer<typeof ListDocumentsInputSchema>;

export class ListDocumentsUseCase extends BaseUseCase<
  ListDocumentsInput,
  PaginatedResult<StoreDocument>
> {
  protected schema = ListDocumentsInputSchema;

  constructor(private readonly orgId: string) {
    super();
  }

  protected async handle(
    input: ListDocumentsInput,
  ): Promise<Result<PaginatedResult<StoreDocument>, AppError>> {
    // Validate store belongs to org
    const storeRepo = new StoreRepository(this.orgId);
    const storeResult = await storeRepo.findById(input.storeId);
    if (!storeResult.ok) return err(storeResult.error);
    if (storeResult.value.orgId !== this.orgId) {
      return err(
        appError("FORBIDDEN", "Store does not belong to your organization"),
      );
    }

    const repo = new StoreDocumentRepository(this.orgId, input.storeId);
    return repo.findByStorePaginated({
      q: input.q,
      sort: input.sort,
      kind: input.kind,
      fileType: input.fileType,
      status: input.status,
      cursor: input.cursor,
      limit: input.limit,
    });
  }
}
