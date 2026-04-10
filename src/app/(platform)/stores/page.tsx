import { getServerContext } from "@/lib/server-context";
import { listStoresQuery } from "@/data/stores/queries/list-stores-query";
import type { StoreSortKey } from "@/data/stores/dto/store-query-dto";
import { StoreListClient } from "@/components/stores/store-list-client";

interface Props {
    searchParams: Promise<{
        q?: string;
        sort?: string;
        cursor?: string;
        limit?: string;
    }>;
}

export default async function StoresPage({ searchParams }: Readonly<Props>) {
    const { orgId } = await getServerContext();

    // Read search parameters
    const params = await searchParams;
    const q = params.q || "";
    const sort = (params.sort || "createdAt_desc") as StoreSortKey;
    const cursor = params.cursor;
    const limit = Number.parseInt(params.limit || "10", 10);

    // Fetch initial data using cached query function
    const result = await listStoresQuery(orgId, {
        q,
        sort,
        cursor,
        limit,
    });

    const initialStores = result.ok ? result.value.items : [];
    const initialNextCursor = result.ok ? result.value.nextCursor : null;

    return (
        <StoreListClient
            orgId={orgId}
            initialStores={initialStores}
            initialNextCursor={initialNextCursor}
        />
    );
}
