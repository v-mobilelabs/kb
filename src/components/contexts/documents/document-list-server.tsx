import {
    Table,
    TableScrollContainer,
    TableContent,
    TableHeader,
    TableBody,
    TableColumn,
} from "@heroui/react";
import { listDocumentsQuery } from "@/data/contexts/queries/list-documents-query";
import type { DocumentSortKey } from "@/data/contexts/dto/context-dto";
import { DocumentRow } from "./document-row";
import { DocumentPagination } from "./document-pagination";

interface Props {
    orgId: string;
    contextId: string;
    sort: DocumentSortKey;
    cursor?: string;
    filterId?: string;
}

export async function DocumentListServer({ orgId, contextId, sort, cursor, filterId }: Readonly<Props>) {
    console.log("[DocumentListServer] Rendering documents for context:", contextId);
    const result = await listDocumentsQuery(orgId, contextId, { sort, cursor, filterId, limit: 25 });
    console.log("[DocumentListServer] Query result ok:", result.ok, "items count:", result.ok ? result.value.items.length : 0);
    const docs = result.ok ? result.value.items : [];
    const nextCursor = result.ok ? result.value.nextCursor : null;

    if (docs.length === 0) {
        return (
            <div className="rounded-xl border border-foreground/10 p-12 text-center text-sm text-foreground/50">
                {filterId ? `No document found with ID "${filterId}".` : "No documents yet. Add one to get started."}
            </div>
        );
    }

    return (
        <>
            <Table>
                <TableScrollContainer>
                    <TableContent aria-label="Documents" selectionMode="none">
                        <TableHeader>
                            <TableColumn id="id" isRowHeader>ID</TableColumn>
                            <TableColumn id="name">Name</TableColumn>
                            <TableColumn id="created" className="w-28">Created</TableColumn>
                            <TableColumn id="actions" className="w-36 text-right">Actions</TableColumn>
                        </TableHeader>
                        <TableBody>
                            {docs.map((doc) => (
                                <DocumentRow key={doc.id} document={doc} contextId={contextId} />
                            ))}
                        </TableBody>
                    </TableContent>
                </TableScrollContainer>
            </Table>
            <DocumentPagination
                currentCursor={cursor ?? null}
                nextCursor={nextCursor}
                count={docs.length}
            />
        </>
    );
}
