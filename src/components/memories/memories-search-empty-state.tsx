"use client";

import { Button } from "@heroui/react";

interface MemoriesSearchEmptyStateProps {
    query: string;
    onClear: () => void;
}

export function MemoriesSearchEmptyState({
    query,
    onClear,
}: Readonly<MemoriesSearchEmptyStateProps>) {
    return (
        <div className="text-center py-16 text-foreground/50">
            <p className="text-lg font-medium">
                No memories match &ldquo;{query}&rdquo;
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
