"use client";

import { Button, TableRow, TableCell, Badge } from "@heroui/react";
import type { ContextDocument } from "@/data/contexts/models/context-document.model";
import { useDocumentActions } from "./document-actions-provider";

export function DocumentRow({
    document,

}: Readonly<{ document: ContextDocument; contextId: string }>) {
    const { openEdit, openDelete } = useDocumentActions();
    const roleColors: Record<string, string> = {
        'user': 'primary',
        'system': 'secondary',
        'assistant': 'success',
    };
    return (
        <TableRow id={document.id}>
            <TableCell>
                <span className="font-mono text-xs text-foreground/70 truncate block max-w-50">
                    {document.id}
                </span>
            </TableCell>
            <TableCell>
                <Badge color={roleColors[document.role] as any} className="capitalize">
                    {document.role}
                </Badge>
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
