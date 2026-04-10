"use client";

import { useState, useRef } from "react";
import { Button, Spinner } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { listApiKeysAction } from "@/actions/organization-actions";
import type { Store } from "@/data/stores/models/store.model";

interface QueryOutput {
    answer: string;
    sources: Array<{
        id: string;
        name: string;
        summary?: string;
        keywords?: string[];
        score?: number;
    }>;
    retrievedCount: number;
}

interface RagQueryTesterProps {
    orgId: string;
}

export function RagQueryTester({ orgId }: RagQueryTesterProps) {
    const [selectedStoreId, setSelectedStoreId] = useState<string>("");
    const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>("");
    const [query, setQuery] = useState<string>("");
    const [topK, setTopK] = useState<number>(10);
    const [isQuerying, setIsQuerying] = useState(false);
    const [result, setResult] = useState<QueryOutput | null>(null);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Filter states
    const [filterKind, setFilterKind] = useState<string>("");
    const [filterSourceId, setFilterSourceId] = useState<string>("");
    const [filterSourceCollection, setFilterSourceCollection] = useState<string>("");

    // Fetch API keys
    const {
        data: apiKeyResponse,
        isPending: isLoadingApiKeys,
        error: apiKeyError,
    } = useQuery({
        queryKey: ["apiKeys"],
        queryFn: async () => {
            const result = await listApiKeysAction();
            if (!result.ok) throw new Error(result.error.message);
            return result.value;
        },
    });

    // Fetch stores
    const {
        data: storesResponse,
        isPending: isLoadingStores,
        error: storesError,
    } = useQuery({
        queryKey: ["stores", orgId],
        queryFn: async () => {
            const response = await fetch(`/api/stores?limit=100`);
            if (!response.ok) throw new Error("Failed to load stores");
            const data = (await response.json()) as { items?: Store[] };
            return data.items || [];
        },
    });

    const apiKeys = apiKeyResponse?.keys || [];
    const stores = storesResponse || [];

    const handleQuery = async () => {
        if (!selectedStoreId || !selectedApiKeyId || !query.trim()) {
            setError("Please select a store and API key, and enter a query");
            return;
        }

        setIsQuerying(true);
        setError(null);
        setResult(null);

        // Create new AbortController for this request
        abortControllerRef.current = new AbortController();

        try {
            // Build filters object
            const filters: Record<string, string> = {};
            if (filterKind.trim()) filters.kind = filterKind.trim();
            if (filterSourceId.trim()) filters["source.id"] = filterSourceId.trim();
            if (filterSourceCollection.trim()) filters["source.collection"] = filterSourceCollection.trim();

            const response = await fetch(`/api/stores/${selectedStoreId}/query-rag`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: query.trim(),
                    apiKeyId: selectedApiKeyId,
                    topK,
                    filters: Object.keys(filters).length > 0 ? filters : undefined,
                }),
                signal: abortControllerRef.current.signal,
            });

            const data = (await response.json()) as unknown;

            if (!response.ok) {
                const errorData = data as { error?: string; message?: string };
                setError(
                    errorData.message || errorData.error || "Failed to query RAG",
                );
            } else {
                setResult(data as QueryOutput);
            }
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") {
                setError("Query cancelled");
            } else {
                setError(err instanceof Error ? err.message : "An error occurred");
            }
        } finally {
            setIsQuerying(false);
            abortControllerRef.current = null;
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Input Card */}
            <div className="rounded-xl border border-foreground/10 bg-surface p-6 flex flex-col gap-4">
                <div>
                    <h3 className="text-lg font-semibold">Test Query</h3>
                    <p className="text-sm text-foreground/60 mt-1">
                        Search across your knowledge bases using semantic search
                    </p>
                </div>

                {/* Store Selection */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Store</label>
                    {isLoadingStores ? (
                        <div className="flex items-center gap-2">
                            <Spinner size="sm" />
                            <span className="text-sm text-foreground/60">
                                Loading stores...
                            </span>
                        </div>
                    ) : storesError ? (
                        <div className="text-sm text-danger">Failed to load stores</div>
                    ) : stores.length === 0 ? (
                        <div className="text-sm text-foreground/60">
                            No stores available. Create one first.
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <select
                                value={selectedStoreId}
                                onChange={(e) => setSelectedStoreId(e.target.value)}
                                disabled={isQuerying}
                                className="flex-1 bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:bg-foreground/10 transition-colors"
                            >
                                <option value="">Select a store...</option>
                                {stores.map((store) => (
                                    <option key={store.id} value={store.id}>
                                        {store.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* API Key Selection */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">API Key</label>
                    {isLoadingApiKeys ? (
                        <div className="flex items-center gap-2">
                            <Spinner size="sm" />
                            <span className="text-sm text-foreground/60">
                                Loading API keys...
                            </span>
                        </div>
                    ) : apiKeyError ? (
                        <div className="text-sm text-danger">
                            Failed to load API keys
                        </div>
                    ) : apiKeys.length === 0 ? (
                        <div className="text-sm text-foreground/60">
                            No API keys available. Please create one in Settings first.
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <select
                                value={selectedApiKeyId}
                                onChange={(e) => setSelectedApiKeyId(e.target.value)}
                                disabled={isQuerying}
                                className="flex-1 bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:bg-foreground/10 transition-colors"
                            >
                                <option value="">Select an API key...</option>
                                {apiKeys.map((key) => (
                                    <option key={key.id} value={key.id}>
                                        {key.name} ({key.maskedKey})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Query Input */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Query</label>
                    <textarea
                        placeholder="Enter your search query..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        disabled={isQuerying}
                        className="w-full min-h-24 max-h-40 bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors resize-vertical"
                    />
                </div>

                {/* Top K Selection */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="topk-range" className="text-sm font-medium">Top Results ({topK})</label>
                    <input
                        id="topk-range"
                        type="range"
                        min={1}
                        max={50}
                        value={topK}
                        onChange={(e) => setTopK(parseInt(e.target.value))}
                        disabled={isQuerying}
                        className="w-full"
                    />
                    <div className="flex gap-2">
                        <input
                            id="topk-number"
                            type="number"
                            min={1}
                            max={50}
                            value={topK}
                            onChange={(e) =>
                                setTopK(Math.min(50, Math.max(1, parseInt(e.target.value) || 10)))
                            }
                            disabled={isQuerying}
                            className="w-24 bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
                            aria-label="Top results number input"
                        />
                    </div>
                </div>

                {/* Filters Section */}
                <div className="border-t border-foreground/10 pt-4 mt-2">
                    <h4 className="text-sm font-semibold mb-3">Filters (Optional)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Kind Filter */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="filter-kind" className="text-xs font-medium text-foreground/70">
                                Document Kind
                            </label>
                            <input
                                id="filter-kind"
                                type="text"
                                placeholder="e.g., pdf, doc, sheet"
                                value={filterKind}
                                onChange={(e) => setFilterKind(e.target.value)}
                                disabled={isQuerying}
                                className="bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
                            />
                        </div>

                        {/* Source ID Filter */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="filter-source-id" className="text-xs font-medium text-foreground/70">
                                Source ID
                            </label>
                            <input
                                id="filter-source-id"
                                type="text"
                                placeholder="source.id"
                                value={filterSourceId}
                                onChange={(e) => setFilterSourceId(e.target.value)}
                                disabled={isQuerying}
                                className="bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
                            />
                        </div>

                        {/* Source Collection Filter */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="filter-source-collection" className="text-xs font-medium text-foreground/70">
                                Source Collection
                            </label>
                            <input
                                id="filter-source-collection"
                                type="text"
                                placeholder="source.collection"
                                value={filterSourceCollection}
                                onChange={(e) => setFilterSourceCollection(e.target.value)}
                                disabled={isQuerying}
                                className="bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm">
                        {error}
                    </div>
                )}

                {/* Query Button */}
                <div className="flex gap-2">
                    <Button
                        onPress={handleQuery}
                        isDisabled={
                            !selectedStoreId ||
                            !selectedApiKeyId ||
                            !query.trim() ||
                            isQuerying ||
                            stores.length === 0 ||
                            apiKeys.length === 0
                        }
                        className="flex-1"
                    >
                        {isQuerying ? "Querying..." : "Test Query"}
                    </Button>
                    {isQuerying && (
                        <Button
                            onPress={handleStop}
                            className="flex-1"
                            variant="danger"
                        >
                            Stop
                        </Button>
                    )}
                </div>
            </div>

            {/* Results */}
            {result && (
                <div className="flex flex-col gap-4">
                    {/* Answer */}
                    <div className="rounded-xl border border-foreground/10 bg-surface p-6 flex flex-col gap-2">
                        <h3 className="text-lg font-semibold">Answer</h3>
                        <p className="text-foreground whitespace-pre-wrap break-words">
                            {result.answer}
                        </p>
                    </div>

                    {/* Sources */}
                    {(() => {
                        const filteredSources = result.sources.slice(0, topK);
                        return filteredSources.length > 0 ? (
                            <div className="rounded-xl border border-foreground/10 bg-surface p-6 flex flex-col gap-3">
                                <h3 className="text-lg font-semibold">
                                    Sources ({filteredSources.length} documents retrieved)
                                </h3>
                                <div className="flex flex-col gap-3">
                                    {filteredSources.map((source, idx) => (
                                        <div
                                            key={idx}
                                            className="flex flex-col gap-2 p-3 rounded-lg bg-foreground/5 border border-foreground/10"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex flex-col gap-1">
                                                    <h4 className="font-semibold text-sm">{source.name}</h4>
                                                    {source.summary && (
                                                        <p className="text-xs text-foreground/70 break-words">
                                                            {source.summary}
                                                        </p>
                                                    )}
                                                </div>
                                                {source.score !== undefined && (
                                                    <div className="shrink-0 text-xs font-medium text-foreground/60 bg-foreground/10 px-2 py-1 rounded">
                                                        {(source.score * 100).toFixed(1)}%
                                                    </div>
                                                )}
                                            </div>
                                            {source.keywords && source.keywords.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {source.keywords.map((keyword, keyIdx) => (
                                                        <span
                                                            key={keyIdx}
                                                            className="text-xs bg-accent/20 text-accent rounded px-2 py-0.5"
                                                        >
                                                            {keyword}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-foreground/10 bg-surface p-6">
                                <p className="text-sm text-foreground/60">
                                    No exact matches found. Retrieved {result.retrievedCount} documents with partial matches.
                                </p>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
