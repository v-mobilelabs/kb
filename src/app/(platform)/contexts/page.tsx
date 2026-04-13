import { Suspense } from "react";
import { getServerContext } from "@/lib/server-context";
import type { ContextSortKey } from "@/data/contexts/dto/context-dto";
import { ContextActionsProvider } from "@/components/contexts/context-actions-provider";
import { ContextListServer } from "@/components/contexts/context-list-server";
import { ContextModals } from "@/components/contexts/context-modals";

interface Props {
    searchParams: Promise<{
        sort?: string;
        cursor?: string;
        history?: string;
    }>;
}

function ContextListSkeleton() {
    return (
        <div className="flex flex-col gap-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-foreground/10 rounded-xl" />
            ))}
        </div>
    );
}

export default async function ContextsPage({ searchParams }: Readonly<Props>) {
    const { orgId } = await getServerContext();
    const params = await searchParams;
    const sort = (params.sort ?? "updatedAt_desc") as ContextSortKey;
    const cursor = params.cursor;

    return (
        <ContextActionsProvider>
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Contexts</h1>
                    <ContextModals orgId={orgId ?? ""} />
                </div>
                <Suspense key={`${sort}|${cursor ?? ""}`} fallback={<ContextListSkeleton />}>
                    <ContextListServer orgId={orgId ?? ""} sort={sort} cursor={cursor} />
                </Suspense>
            </div>
        </ContextActionsProvider>
    );
}
