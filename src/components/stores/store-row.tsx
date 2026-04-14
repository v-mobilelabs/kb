"use client";

import Link from "next/link";
import { Button, TableRow, TableCell } from "@heroui/react";
import type { Store } from "@/data/stores/models/store.model";
import { useStoreActions } from "./store-actions-provider";

interface StoreRowProps {
    store: Store;
}

function formatDate(d: Date): string {
    return new Intl.DateTimeFormat("en", { dateStyle: "short" }).format(
        new Date(d)
    );
}

export function StoreRow({ store }: Readonly<StoreRowProps>) {
    const { openEdit, openDelete } = useStoreActions();
    return (
        <TableRow id={store.id}>
            <TableCell>
                <Link
                    href={`/stores/${store.id}`}
                    className="font-medium text-sm text-foreground hover:text-accent transition-colors truncate block"
                >
                    {store.name}
                </Link>
            </TableCell>
            <TableCell className="text-center">
                <span className="text-xs text-foreground/50">
                    {store.customCount}
                </span>
            </TableCell>
            <TableCell>
                <span className="text-xs text-foreground/50 whitespace-nowrap">
                    {formatDate(store.createdAt)}
                </span>
            </TableCell>
            <TableCell>
                <div className="flex gap-1 justify-end">
                    <Button
                        size="sm"
                        variant="outline"
                        onPress={() => openEdit(store)}
                    >
                        Edit
                    </Button>
                    <Button
                        size="sm"
                        variant="danger"
                        onPress={() => openDelete(store)}
                    >
                        Delete
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}
