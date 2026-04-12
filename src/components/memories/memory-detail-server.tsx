import Link from "next/link";
import { getMemoryQuery } from "@/data/memories/queries/get-memory-query";
import type { MemoryDocumentSortKey } from "@/data/memories/schemas";
import { MemoryCapacityBar } from "./memory-capacity-bar";
import { MemoryDocumentsClient } from "./memory-documents-client";

interface MemoryDetailServerProps {
    orgId: string;
    memoryId: string;
    initialSort: MemoryDocumentSortKey;
    initialSearch: string;
    initialIncludeCondensed: boolean;
}

export async function MemoryDetailServer({
    orgId,
    memoryId,
    initialSort,
    initialSearch,
    initialIncludeCondensed,
}: Readonly<MemoryDetailServerProps>) {
    const result = await getMemoryQuery(orgId, memoryId);
    const memory = result.ok ? result.value : null;

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div>
                <Link
                    href="/memories"
                    className="text-sm text-foreground/50 hover:text-foreground transition-colors"
                >
                    ← Back to Memories
                </Link>
                <div className="flex items-center justify-between mt-2">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground/70">{memoryId}</h1>
                        {memory?.description && (
                            <p className="text-sm text-foreground/60 mt-2 max-w-2xl">
                                {memory.description}
                            </p>
                        )}
                    </div>
                </div>
                {memory && (
                    <div className="mt-3">
                        <MemoryCapacityBar
                            documentCount={memory.documentCount}
                            documentCapacity={memory.documentCapacity}
                            condenseThresholdPercent={memory.condenseThresholdPercent}
                        />
                    </div>
                )}
            </div>

            {/* Document list */}
            <MemoryDocumentsClient
                orgId={orgId}
                memoryId={memoryId}
                initialSort={initialSort}
                initialSearch={initialSearch}
                initialIncludeCondensed={initialIncludeCondensed}
            />
        </div>
    );
}
