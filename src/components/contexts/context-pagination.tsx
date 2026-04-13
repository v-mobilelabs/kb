"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@heroui/react";

interface ContextPaginationProps {
    currentCursor: string | null;
    nextCursor: string | null;
    count: number;
}

export function ContextPagination({ currentCursor, nextCursor, count }: Readonly<ContextPaginationProps>) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const hasPrev = searchParams.get("history") !== null;

    function handleNext() {
        if (!nextCursor) return;
        const params = new URLSearchParams(searchParams.toString());
        const stack = (searchParams.get("history") ?? "").split(",").filter(Boolean);
        stack.push(currentCursor ?? "");
        params.set("cursor", nextCursor);
        params.set("history", stack.join(","));
        router.push(`${pathname}?${params.toString()}`);
    }

    function handlePrev() {
        const params = new URLSearchParams(searchParams.toString());
        const stack = (searchParams.get("history") ?? "").split(",").filter(Boolean);
        const prevCursor = stack.pop();
        if (prevCursor) params.set("cursor", prevCursor);
        else params.delete("cursor");
        if (stack.length > 0) params.set("history", stack.join(","));
        else params.delete("history");
        params.delete("cursor");
        if (prevCursor) params.set("cursor", prevCursor);
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <div className="flex items-center justify-between mt-4">
            <Button variant="outline" isDisabled={!hasPrev} onPress={handlePrev}>
                ← Previous
            </Button>
            <span className="text-sm text-foreground/70">
                Showing {count} context{count === 1 ? "" : "s"}
            </span>
            <Button variant="outline" isDisabled={!nextCursor} onPress={handleNext}>
                Next →
            </Button>
        </div>
    );
}
