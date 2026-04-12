import { Suspense } from "react";
import { getServerContext } from "@/lib/server-context";
import type { MemorySortKey } from "@/data/memories/schemas";
import { MemoryActionsProvider } from "@/components/memories/memory-actions-provider";
import { MemoryFilters } from "@/components/memories/memory-filters";
import { MemoryListServer } from "@/components/memories/memory-list-server";
import { NewMemoryButton } from "@/components/memories/new-memory-button";
import { MemoriesSkeletonList } from "@/components/memories/memories-skeleton-list";

interface Props {
    searchParams: Promise<{
        q?: string;
        sort?: string;
        cursor?: string;
    }>;
}

export default async function MemoriesPage({ searchParams }: Readonly<Props>) {
    const { orgId } = await getServerContext();
    const params = await searchParams;

    const q = params.q ?? "";
    const sort = (params.sort ?? "createdAt_desc") as MemorySortKey;
    const cursor = params.cursor;

    return (
        <MemoryActionsProvider orgId={orgId ?? ""}>
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Memories</h1>
                    <NewMemoryButton />
                </div>

                <MemoryFilters />

                <Suspense key={`${q}-${sort}-${cursor}`} fallback={<MemoriesSkeletonList />}>
                    <MemoryListServer
                        orgId={orgId ?? ""}
                        q={q}
                        sort={sort}
                        cursor={cursor}
                    />
                </Suspense>
            </div>
        </MemoryActionsProvider>
    );
}
