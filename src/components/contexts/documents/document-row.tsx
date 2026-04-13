"use client";

import { Button, TableRow, TableCell } from "@heroui/react";
import type { ContextDocument } from "@/data/contexts/models/context-document.model";
import { useDocumentActions } from "./document-actions-provider";

function formatDate(ts: number): string {
    return new Intl.DateTimeFormat("en", { dateStyle: "short" }).format(new Date(ts));
}

export function DocumentRow({
    document,
    contextId,
}: Readonly<{ document: ContextDocument; contextId: string }>) {
    const { openEdit, openDelete } = useDocumentActions();
    return (
        <TableRow id={document.id}>
            <TableCell>
                <span className="font-mono text-xs text-foreground/70 truncate block max-w-50">
                    {document.id}
                </span>
            </TableCell>
            <TableCell>
                <span className="text-sm">{document.name ?? <span className="text-foreground/40 italic">unnamed</span>}</span>
            </TableCell>
            <TableCell>
                <span className="text-xs text-foreground/50 whitespace-nowrap">
                    {formatDate(document.createdAt)}
                </span>
            </TableCell>
            <TableCell>
                <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="outline" onPress={() => openEdit(document)}>
                        Edit
                    </Button>
                    <Button size="sm" variant="danger" onPress={() => openDelete(document)}>
                        Delete
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}
