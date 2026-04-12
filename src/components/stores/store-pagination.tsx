"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@heroui/react";

interface StorePaginationProps {
    currentCursor: string | null;
    nextCursor: string | null;
    count: number;
}

export function StorePagination({
    currentCursor,
    nextCursor,
    count,
}: Readonly<StorePaginationProps>) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // History is a comma-joined stack of previous cursors ("" = page 1)
    const historyRaw = searchParams.get("history") ?? null;
    const hasPrev = historyRaw !== null;

    function handleNext() {
        if (!nextCursor) return;
        const params = new URLSearchParams(searchParams.toString());
        const oldHistory = searchParams.get("history") ?? "";
        const stack = oldHistory ? oldHistory.split(",") : [];
        stack.push(currentCursor ?? "");
        params.set("cursor", nextCursor);
        params.set("history", stack.join(","));
        router.push(`${pathname}?${params.toString()}`);
    }

    function handlePrev() {
        const params = new URLSearchParams(searchParams.toString());
        const historyStr = searchParams.get("history") ?? "";
        const stack = historyStr.split(",");
        const prevCursor = stack.pop();
        if (prevCursor) params.set("cursor", prevCursor);
        else params.delete("cursor");
        if (stack.length > 0) params.set("history", stack.join(","));
        else params.delete("history");
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <div className="flex items-center justify-between mt-4">
            <Button variant="outline" isDisabled={!hasPrev} onPress={handlePrev}>
                ← Previous
            </Button>
            <span className="text-sm text-foreground/70">
                {count > 0 ? `Showing ${count} stores` : "No stores"}
            </span>
            <Button variant="outline" isDisabled={!nextCursor} onPress={handleNext}>
                Next →
            </Button>
        </div>
    );
}
