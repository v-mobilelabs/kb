import { getServerContext } from "@/lib/server-context";
import { listDocumentsQuery } from "@/data/stores/queries/list-documents-query";
import { DocumentListClient } from "@/components/stores/documents/document-list-client";
import type {
    DocumentSortKey,
    DocumentKindFilter,
    FileTypeFilter,
} from "@/data/stores/dto/store-query-dto";

interface Params {
    storeId: string;
}

interface SearchParams {
    q?: string;
    sort?: string;
    kind?: string;
    fileType?: string;
    page?: string;
    limit?: string;
}

export default async function StoreDocumentsPage({
    params,
    searchParams,
}: Readonly<{
    params: Promise<Params>;
    searchParams: Promise<SearchParams>;
}>) {
    const { storeId } = await params;
    const queryParams = await searchParams;

    const { orgId } = await getServerContext();

    // Extract and parse query parameters with defaults
    const q = queryParams.q || "";
    const sort = (queryParams.sort || "createdAt_desc") as DocumentSortKey;
    const kind = queryParams.kind as DocumentKindFilter || undefined;
    const fileType = queryParams.fileType as FileTypeFilter || undefined;
    const limit = Math.min(
        Math.max(Number.parseInt(queryParams.limit || "10", 10), 1),
        100
    );

    // Fetch paginated documents using the use case via query
    const docsResult = await listDocumentsQuery(orgId ?? '', storeId, {
        q,
        sort,
        kind,
        fileType,
        cursor: undefined,
        limit,
    });

    const initialDocuments = docsResult.ok ? docsResult.value.items : [];
    const initialNextCursor = docsResult.ok ? docsResult.value.nextCursor : null;

    return (
        <DocumentListClient
            orgId={orgId ?? ''}
            storeId={storeId}
            initialDocuments={initialDocuments}
            initialNextCursor={initialNextCursor}
        />
    );
}
