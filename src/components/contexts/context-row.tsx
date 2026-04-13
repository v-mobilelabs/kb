"use client";

import Link from "next/link";
import { Button, TableRow, TableCell } from "@heroui/react";
import type { Context } from "@/data/contexts/models/context.model";
import { useContextActions } from "./context-actions-provider";

function formatDate(d: Date): string {
    return new Intl.DateTimeFormat("en", { dateStyle: "short" }).format(new Date(d));
}

export function ContextRow({ context }: Readonly<{ context: Context }>) {
    const { openEdit, openDelete } = useContextActions();
    return (
        <TableRow id={context.id}>
            <TableCell>
                <Link
                    href={`/contexts/${context.id}`}
                    className="font-medium text-sm text-foreground hover:text-accent transition-colors"
                >
                    {context.name}
                </Link>
            </TableCell>
            <TableCell className="text-center">
                <span className="text-xs text-foreground/50">
                    {context.windowSize == null ? "Unbounded" : context.windowSize.toLocaleString()}
                </span>
            </TableCell>
            <TableCell className="text-center">
                <span className="text-xs text-foreground/50">{context.documentCount}</span>
            </TableCell>
            <TableCell>
                <span className="text-xs text-foreground/50 whitespace-nowrap">
                    {formatDate(context.updatedAt)}
                </span>
            </TableCell>
            <TableCell>
                <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="outline" onPress={() => openEdit(context)}>
                        Edit
                    </Button>
                    <Button size="sm" variant="danger" onPress={() => openDelete(context)}>
                        Delete
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}
