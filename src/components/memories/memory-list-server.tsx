import {
    Table,
    TableScrollContainer,
    TableContent,
    TableHeader,
    TableBody,
    TableColumn,
} from "@heroui/react";
import { listMemoriesQuery } from "@/data/memories/queries/list-memories-query";
import type { MemorySortKey } from "@/data/memories/schemas";
import { MemoryRow } from "./memory-row";
import { MemoryEmptyState } from "./memory-empty-state";
import { MemoryPagination } from "./memory-pagination";

interface MemoryListServerProps {
    orgId: string;
    q: string;
    sort: MemorySortKey;
    cursor?: string;
}

export async function MemoryListServer({
    orgId,
    q,
    sort,
    cursor,
}: Readonly<MemoryListServerProps>) {
    const result = await listMemoriesQuery(orgId, {
        q: q || undefined,
        sort,
        cursor,
        limit: 25,
    });

    if (!result.ok) {
        return (
            <p className="text-sm text-foreground/50 py-8 text-center">
                Failed to load memories.
            </p>
        );
    }

    const { items, nextCursor } = result.value;

    if (items.length === 0) {
        return <MemoryEmptyState query={q || undefined} />;
    }

    return (
        <div className="flex flex-col gap-4">
            <Table>
                <TableScrollContainer>
                    <TableContent aria-label="Memories" selectionMode="none">
                        <TableHeader>
                            <TableColumn id="name" isRowHeader>
                                Name
                            </TableColumn>
                            <TableColumn id="documents" className="text-center w-24">
                                Documents
                            </TableColumn>
                            <TableColumn id="created" className="w-24">
                                Created
                            </TableColumn>
                            <TableColumn id="actions" className="w-40 text-right">
                                Actions
                            </TableColumn>
                        </TableHeader>
                        <TableBody>
                            {items.map((memory) => (
                                <MemoryRow key={memory.id} memory={memory} />
                            ))}
                        </TableBody>
                    </TableContent>
                </TableScrollContainer>
            </Table>

            <MemoryPagination currentCursor={cursor} nextCursor={nextCursor ?? null} count={items.length} />
        </div>
    );
}
