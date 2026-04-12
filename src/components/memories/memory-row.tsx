"use client";

import Link from "next/link";
import { Button, TableRow, TableCell } from "@heroui/react";
import type { Memory } from "@/data/memories/types";
import { useMemoryActions } from "./memory-actions-provider";

interface MemoryRowProps {
    memory: Memory;
}

function formatDate(d: Date): string {
    return new Intl.DateTimeFormat("en", { dateStyle: "short" }).format(
        new Date(d)
    );
}

export function MemoryRow({ memory }: Readonly<MemoryRowProps>) {
    const { openEdit, openDelete } = useMemoryActions();
    return (
        <TableRow id={memory.id}>
            <TableCell>
                <Link
                    href={`/memories/${memory.id}`}
                    className="font-medium text-sm text-foreground hover:text-accent transition-colors truncate block"
                >
                    <span className="text-xs text-foreground/50 uppercase tracking-wide">
                        Memory
                    </span>
                    <p className="text-xs text-foreground/40 font-mono truncate mt-1">
                        {memory.id}
                    </p>
                </Link>
            </TableCell>
            <TableCell className="text-center">
                <span className="text-xs text-foreground/50 font-mono">
                    {memory.documentCount} / {memory.documentCapacity}
                </span>
            </TableCell>
            <TableCell>
                <span className="text-xs text-foreground/50 whitespace-nowrap">
                    {formatDate(memory.createdAt)}
                </span>
            </TableCell>
            <TableCell>
                <div className="flex gap-1 justify-end">
                    <Button
                        size="sm"
                        variant="outline"
                        onPress={() => openEdit(memory)}
                    >
                        Edit
                    </Button>
                    <Button
                        size="sm"
                        variant="danger"
                        onPress={() => openDelete(memory)}
                    >
                        Delete
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}
