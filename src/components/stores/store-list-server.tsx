import {
    Table,
    TableScrollContainer,
    TableContent,
    TableHeader,
    TableBody,
    TableColumn,
} from "@heroui/react";
import { listStoresQuery } from "@/data/stores/queries/list-stores-query";
import type { StoreSortKey } from "@/data/stores/dto/store-query-dto";
import { StoreRow } from "./store-row";
import { StorePagination } from "./store-pagination";
import { StoreEmptyState } from "./store-empty-state";

interface StoreListServerProps {
    orgId: string;
    q: string;
    sort: StoreSortKey;
    cursor?: string;
}

export async function StoreListServer({
    orgId,
    q,
    sort,
    cursor,
}: Readonly<StoreListServerProps>) {
    const result = await listStoresQuery(orgId, { q, sort, cursor, limit: 10 });
    const stores = result.ok ? result.value.items : [];
    const nextCursor = result.ok ? result.value.nextCursor : null;

    if (stores.length === 0) {
        return <StoreEmptyState hasQuery={!!q} query={q} />;
    }

    return (
        <>
            <Table>
                <TableScrollContainer>
                    <TableContent aria-label="Stores" selectionMode="none">
                        <TableHeader>
                            <TableColumn id="name" isRowHeader>
                                Name
                            </TableColumn>
                            <TableColumn id="records" className="text-center w-16">
                                Records
                            </TableColumn>
                            <TableColumn id="created" className="w-24">
                                Created
                            </TableColumn>
                            <TableColumn id="actions" className="w-40 text-right">
                                Actions
                            </TableColumn>
                        </TableHeader>
                        <TableBody>
                            {stores.map((store) => (
                                <StoreRow key={store.id} store={store} />
                            ))}
                        </TableBody>
                    </TableContent>
                </TableScrollContainer>
            </Table>
            <StorePagination
                currentCursor={cursor ?? null}
                nextCursor={nextCursor}
                count={stores.length}
            />
        </>
    );
}
