"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@heroui/react";
import { useStoreActions } from "./store-actions-provider";

interface StoreEmptyStateProps {
    hasQuery: boolean;
    query?: string;
}

export function StoreEmptyState({ hasQuery, query }: Readonly<StoreEmptyStateProps>) {
    const { openCreate } = useStoreActions();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    function clearSearch() {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("q");
        params.delete("cursor");
        params.delete("history");
        router.replace(`${pathname}?${params.toString()}`);
    }

    if (hasQuery) {
        return (
            <div className="text-center py-16 text-foreground/50">
                <p className="text-lg font-medium">No stores match &ldquo;{query}&rdquo;</p>
                <p className="text-sm mt-1 mb-4">Name search matches by prefix only.</p>
                <Button variant="outline" onPress={clearSearch}>
                    Clear search
                </Button>
            </div>
        );
    }

    return (
        <div className="text-center py-16 text-foreground/50">
            <p className="text-lg font-medium">No stores yet</p>
            <p className="text-sm mt-1">Create your first store to get started.</p>
            <Button variant="primary" className="mt-4" onPress={openCreate}>
                New store
            </Button>
        </div>
    );
}
