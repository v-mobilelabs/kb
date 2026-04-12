"use client";

import { Button } from "@heroui/react";

interface MemoryDocumentsSearchEmptyStateProps {
    query: string;
    onClear: () => void;
}

export function MemoryDocumentsSearchEmptyState({
    query,
    onClear,
}: Readonly<MemoryDocumentsSearchEmptyStateProps>) {
    return (
        <div className="text-center py-16 text-foreground/50">
            <p className="text-lg font-medium">
                No documents match &ldquo;{query}&rdquo;
            </p>
            <p className="text-sm mt-1 mb-4">
                Title search matches by prefix only.
            </p>
            <Button variant="outline" onPress={onClear}>
                Clear search
            </Button>
        </div>
    );
}
