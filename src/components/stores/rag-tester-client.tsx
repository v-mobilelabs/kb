"use client";

import { useState } from "react";
import { Button, Spinner, ListBox, ListBoxItem, Select } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { listApiKeysAction } from "@/actions/organization-actions";
import type { Store } from "@/data/stores/models/store.model";

interface QueryOutput {
  answer: string;
  sources: Array<{
    id: string;
    data?: Record<string, unknown> | string | null;
    source?: { id: string; collection: string } | null;
    summary?: string | null;
    updatedAt?: string | null;
    score?: number;
  }>;
  retrievedCount: number;
  judgment?: {
    relevant: boolean;
    confidence: number;
    reasoning: string;
    answer: string;
  };
}

interface RagTesterProps {
  store: Store;
  orgId: string;
}

export function RagTesterClient({ store }: RagTesterProps) {
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [topK, setTopK] = useState<number>(10);
  const [isQuerying, setIsQuerying] = useState(false);
  const [result, setResult] = useState<QueryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const apiKeys = apiKeyResponse?.keys || [];

  const handleQuery = async () => {
    if (!selectedApiKeyId || !query.trim()) {
      setError("Please select an API key and enter a query");
      return;
    }

    setIsQuerying(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/stores/${store.id}/query-rag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          apiKeyId: selectedApiKeyId,
          topK,
        }),
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
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Input Card */}
      <div className="rounded-xl border border-foreground/10 bg-surface p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold">Test RAG Query</h3>
          <p className="text-sm text-foreground/60 mt-1">
            Test semantic search against your knowledge base in {store.name}
          </p>
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
              No API keys available. Please create one first.
            </div>
          ) : (
            <Select.Root
              value={selectedApiKeyId}
              onChange={(key) => setSelectedApiKeyId(key as string)}
              aria-label="Select API key"
            >
              <Select.Trigger className="w-full">
                {selectedApiKeyId ? (
                  <Select.Value />
                ) : (
                  <span className="text-foreground/50">
                    {apiKeys.length === 0
                      ? "No API keys available"
                      : "Select an API key"}
                  </span>
                )}
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {apiKeys.map((key) => (
                    <ListBoxItem key={key.id} id={key.id} textValue={key.name} className="">
                      <div className="flex justify-between w-full">
                        <span>{key.name}</span>
                        <span className="text-xs text-foreground/50">
                          {key.maskedKey}
                        </span>
                      </div>
                    </ListBoxItem>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select.Root>
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
            className="w-full min-h-20 max-h-32 bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors resize-vertical"
          />
        </div>

        {/* Top K and Min Score */}
        <div className="flex gap-4">
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-sm font-medium">Top Results</label>
            <input
              type="number"
              min={1}
              max={50}
              value={topK}
              onChange={(e) =>
                setTopK(Math.min(50, Math.max(1, parseInt(e.target.value) || 10)))
              }
              disabled={isQuerying}
              className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
            />
          </div>

        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm">
            {error}
          </div>
        )}

        {/* Query Button */}
        <Button
          onPress={handleQuery}
          isDisabled={
            !selectedApiKeyId || !query.trim() || isQuerying || apiKeys.length === 0
          }
          className="w-full"
          variant="primary"
        >
          {isQuerying ? "Querying..." : "Test Query"}
        </Button>
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

          {/* RAG Evaluation judgment */}
          {result.judgment && (
            <div className={`rounded-xl border p-5 flex flex-col gap-3 ${result.judgment.relevant
              ? "border-success/30 bg-success/5"
              : "border-warning/30 bg-warning/5"
              }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${result.judgment.relevant ? "bg-success" : "bg-warning"
                    }`} />
                  <span className="text-sm font-semibold">
                    {result.judgment.relevant ? "Relevant" : "Not relevant"}
                  </span>
                </div>
                <span className="text-xs font-medium text-foreground/60 bg-foreground/10 px-2 py-1 rounded">
                  {(result.judgment.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
              <p className="text-sm text-foreground/70">{result.judgment.reasoning}</p>
            </div>
          )}

          {/* Sources */}
          {result.sources.length > 0 && (
            <div className="rounded-xl border border-foreground/10 bg-surface p-6 flex flex-col gap-3">
              <h3 className="text-lg font-semibold">
                Sources ({result.retrievedCount} documents retrieved)
              </h3>
              <div className="flex flex-col gap-3">
                {result.sources.map((source, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 p-3 rounded-lg bg-foreground/5 border border-foreground/10"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-xs font-mono text-foreground/50 truncate">{source.id}</span>
                        {source.summary && (
                          <p className="text-sm text-foreground/80 break-words">{source.summary}</p>
                        )}
                      </div>
                      {source.score !== undefined && (
                        <div className="shrink-0 text-xs font-medium text-foreground/60 bg-foreground/10 px-2 py-1 rounded">
                          {(source.score * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                    {source.source && (
                      <div className="text-xs text-foreground/50">
                        Source: <span className="font-mono">{source.source.id}</span>{" · "}{source.source.collection}
                      </div>
                    )}
                    {source.updatedAt && (
                      <div className="text-xs text-foreground/40">
                        Updated: {new Date(source.updatedAt).toLocaleString()}
                      </div>
                    )}
                    {source.data && (
                      <details className="mt-1">
                        <summary className="text-xs text-foreground/50 cursor-pointer select-none">View data</summary>
                        <pre className="mt-1 text-xs bg-foreground/5 rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap break-all">
                          {typeof source.data === "string"
                            ? source.data
                            : JSON.stringify(source.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
