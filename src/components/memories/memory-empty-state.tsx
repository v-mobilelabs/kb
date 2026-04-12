"use client";

import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { useMemoryActions } from "./memory-actions-provider";

export function MemoryEmptyState({ query }: Readonly<{ query?: string }>) {
    const { openCreate } = useMemoryActions();
    const router = useRouter();

    if (query) {
        return (
            <div className="text-center py-16 text-foreground/50">
                <p className="text-lg font-medium">
                    No memories match &ldquo;{query}&rdquo;
                </p>
                <p className="text-sm mt-1 mb-4">
                    Title search matches by prefix only.
                </p>
                <Button variant="outline" onPress={() => router.replace("/memories")}>
                    Clear search
                </Button>
            </div>
        );
    }

    return (
        <div className="text-center py-16 text-foreground/50">
            <p className="text-lg font-medium">No memories yet</p>
            <p className="text-sm mt-1">
                Create your first memory to get started.
            </p>
            <Button variant="primary" className="mt-4" onPress={openCreate}>
                New memory
            </Button>
        </div>
    );
}
