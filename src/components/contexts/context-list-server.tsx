import {
    Table,
    TableScrollContainer,
    TableContent,
    TableHeader,
    TableBody,
    TableColumn,
} from "@heroui/react";
import { listContextsQuery } from "@/data/contexts/queries/list-contexts-query";
import type { ContextSortKey } from "@/data/contexts/dto/context-dto";
import { ContextRow } from "./context-row";
import { ContextPagination } from "./context-pagination";

interface Props {
    orgId: string;
    sort: ContextSortKey;
    cursor?: string;
}

export async function ContextListServer({ orgId, sort, cursor }: Readonly<Props>) {
    const result = await listContextsQuery(orgId, { sort, cursor, limit: 25 });
    const contexts = result.ok ? result.value.items : [];
    const nextCursor = result.ok ? result.value.nextCursor : null;

    if (contexts.length === 0) {
        return (
            <div className="rounded-xl border border-foreground/10 p-12 text-center text-sm text-foreground/50">
                No contexts yet. Create one to get started.
            </div>
        );
    }

    return (
        <>
            <Table>
                <TableScrollContainer>
                    <TableContent aria-label="Contexts" selectionMode="none">
                        <TableHeader>
                            <TableColumn id="name" isRowHeader>Name</TableColumn>
                            <TableColumn id="window" className="text-center w-28">Window</TableColumn>
                            <TableColumn id="docs" className="text-center w-20">Documents</TableColumn>
                            <TableColumn id="updated" className="w-28">Updated</TableColumn>
                            <TableColumn id="actions" className="w-36 text-right">Actions</TableColumn>
                        </TableHeader>
                        <TableBody>
                            {contexts.map((ctx) => (
                                <ContextRow key={ctx.id} context={ctx} />
                            ))}
                        </TableBody>
                    </TableContent>
                </TableScrollContainer>
            </Table>
            <ContextPagination currentCursor={cursor ?? null} nextCursor={nextCursor} count={contexts.length} />
        </>
    );
}
