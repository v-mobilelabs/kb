import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerContext } from "@/lib/server-context";
import { getContextQuery } from "@/data/contexts/queries/get-context-query";
import { DocumentActionsProvider } from "@/components/contexts/documents/document-actions-provider";
import { DocumentListServer } from "@/components/contexts/documents/document-list-server";
import { DocumentModals } from "@/components/contexts/documents/document-modals";
import type { DocumentSortKey } from "@/data/contexts/dto/context-dto";

interface Props {
    params: Promise<{ contextId: string }>;
    searchParams: Promise<{
        sort?: string;
        cursor?: string;
        filterId?: string;
        history?: string;
    }>;
}

function DocumentListSkeleton() {
    return (
        <div className="flex flex-col gap-3 animate-pulse">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-foreground/10 rounded-xl" />
            ))}
        </div>
    );
}

export default async function ContextDetailPage({ params, searchParams }: Readonly<Props>) {
    const { orgId } = await getServerContext();
    const { contextId } = await params;
    const sp = await searchParams;

    const contextResult = await getContextQuery(orgId ?? "", contextId);
    if (!contextResult.ok) notFound();

    const context = contextResult.value;
    const sort = (sp.sort ?? "createdAt_desc") as DocumentSortKey;
    const cursor = sp.cursor;
    const filterId = sp.filterId;

    return (
        <DocumentActionsProvider>
            <div className="flex flex-col gap-6">
                {/* Breadcrumb */}
                <nav className="text-sm text-foreground/50">
                    <Link href="/contexts" className="hover:text-foreground transition-colors">
                        Contexts
                    </Link>
                    <span className="mx-2">/</span>
                    <span className="text-foreground">{context.name}</span>
                </nav>

                {/* Context header */}
                <div>
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold">{context.name}</h1>
                        <DocumentModals orgId={orgId ?? ""} contextId={contextId} />
                    </div>
                    <div className="flex gap-6 mt-2 text-sm text-foreground/60">
                        <span>Window: {context.windowSize == null ? "Unbounded" : `${context.windowSize.toLocaleString()} tokens`}</span>
                        <span>{context.documentCount} document{context.documentCount === 1 ? "" : "s"}</span>
                    </div>
                </div>

                {/* Filter by ID input */}
                <form className="flex gap-2">
                    <input
                        type="text"
                        name="filterId"
                        defaultValue={filterId ?? ""}
                        placeholder="Filter by document ID (exact)"
                        className="flex-1 rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                    <button
                        type="submit"
                        className="rounded-lg border border-foreground/20 px-3 py-2 text-sm hover:bg-foreground/5 transition-colors"
                    >
                        Filter
                    </button>
                    {filterId && (
                        <a
                            href={`/contexts/${contextId}`}
                            className="rounded-lg border border-foreground/20 px-3 py-2 text-sm hover:bg-foreground/5 transition-colors"
                        >
                            Clear
                        </a>
                    )}
                </form>

                {/* Document list */}
                <Suspense key={`${sort}|${cursor ?? ""}|${filterId ?? ""}`} fallback={<DocumentListSkeleton />}>
                    <DocumentListServer
                        orgId={orgId ?? ""}
                        contextId={contextId}
                        sort={sort}
                        cursor={cursor}
                        filterId={filterId}
                    />
                </Suspense>
            </div>
        </DocumentActionsProvider>
    );
}
