"use client";

import { Button } from "@heroui/react";

interface MemoriesEmptyStateProps {
    onCreateClick: () => void;
}

export function MemoriesEmptyState({ onCreateClick }: Readonly<MemoriesEmptyStateProps>) {
    return (
        <div className="text-center py-16 text-foreground/50">
            <p className="text-lg font-medium">No memories yet</p>
            <p className="text-sm mt-1">
                Create your first memory to get started.
            </p>
            <Button
                variant="primary"
                className="mt-4"
                onPress={onCreateClick}
            >
                New memory
            </Button>
        </div>
    );
}
