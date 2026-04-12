import { Suspense } from "react";
import { getServerContext } from "@/lib/server-context";
import type { MemoryDocumentSortKey } from "@/data/memories/schemas";
import { MemoryDetailServer } from "@/components/memories/memory-detail-server";

interface Props {
    params: Promise<{ memoryId: string }>;
    searchParams: Promise<{
        q?: string;
        sort?: string;
        includeCondensed?: string;
    }>;
}

function MemoryDetailSkeleton() {
    return (
        <div className="flex flex-col gap-6 animate-pulse">
            <div className="flex flex-col gap-2">
                <div className="h-4 w-32 bg-foreground/10 rounded" />
                <div className="h-8 w-64 bg-foreground/10 rounded" />
                <div className="h-3 w-full max-w-md bg-foreground/10 rounded mt-1" />
                <div className="h-2 w-full bg-foreground/10 rounded mt-2" />
            </div>
            <div className="flex gap-3">
                <div className="h-9 flex-1 bg-foreground/10 rounded-lg" />
                <div className="h-9 w-36 bg-foreground/10 rounded-lg" />
                <div className="h-9 w-32 bg-foreground/10 rounded-lg" />
            </div>
            <div className="flex flex-col gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-14 bg-foreground/10 rounded-lg" />
                ))}
            </div>
        </div>
    );
}

export default async function MemoryDetailPage({
    params,
    searchParams,
}: Readonly<Props>) {
    const { orgId } = await getServerContext();
    const { memoryId } = await params;
    const sp = await searchParams;

    const sort = (sp.sort || "createdAt_desc") as MemoryDocumentSortKey;
    const search = sp.q || "";
    const includeCondensed = sp.includeCondensed !== "false";

    return (
        <Suspense fallback={<MemoryDetailSkeleton />}>
            <MemoryDetailServer
                orgId={orgId ?? ""}
                memoryId={memoryId}
                initialSort={sort}
                initialSearch={search}
                initialIncludeCondensed={includeCondensed}
            />
        </Suspense>
    );
}
