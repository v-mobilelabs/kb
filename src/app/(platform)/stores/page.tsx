import { Suspense } from "react";
import { getServerContext } from "@/lib/server-context";
import type { StoreSortKey } from "@/data/stores/dto/store-query-dto";
import { StoreActionsProvider } from "@/components/stores/store-actions-provider";
import { NewStoreButton } from "@/components/stores/new-store-button";
import { StoreFilters } from "@/components/stores/store-filters";
import { StoreListServer } from "@/components/stores/store-list-server";
import { StoreListSkeleton } from "@/components/stores/store-list-skeleton";

interface Props {
    searchParams: Promise<{
        q?: string;
        sort?: string;
        cursor?: string;
    }>;
}

export default async function StoresPage({ searchParams }: Readonly<Props>) {
    const { orgId } = await getServerContext();
    const params = await searchParams;
    const q = params.q ?? "";
    const sort = (params.sort ?? "createdAt_desc") as StoreSortKey;
    const cursor = params.cursor;

    return (
        <StoreActionsProvider orgId={orgId ?? ""}>
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Stores</h1>
                    <NewStoreButton />
                </div>
                <StoreFilters q={q} sort={sort} />
                <Suspense key={`${q}|${sort}|${cursor ?? ""}`} fallback={<StoreListSkeleton />}>
                    <StoreListServer orgId={orgId ?? ""} q={q} sort={sort} cursor={cursor} />
                </Suspense>
            </div>
        </StoreActionsProvider>
    );
}
