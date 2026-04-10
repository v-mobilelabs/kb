"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import type { Store } from "@/data/stores/models/store.model";
import { StoreEditForm } from "./store-edit-form";
import { ReusableConfirmModal } from "@/components/shared/reusable-confirm-modal";
import { deleteStoreAction } from "@/actions/store-actions";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface StoreCardProps {
    store: Store;
    orgId: string;
}

function formatDate(d: Date): string {
    return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(d));
}

export function StoreCard({ store, orgId }: StoreCardProps) {
    const queryClient = useQueryClient();
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const deleteMutation = useMutation({
        mutationFn: () => deleteStoreAction({ storeId: store.id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stores", orgId], exact: false });
            setDeleteOpen(false);
        },
    });

    function handleDelete() {
        deleteMutation.mutate();
    }

    const truncatedDesc =
        store.description && store.description.length > 120
            ? store.description.slice(0, 120) + "…"
            : store.description;

    return (
        <>
            <div className="rounded-xl border border-foreground/10 bg-surface p-5 flex flex-col gap-2 hover:border-foreground/20 transition-colors">
                <Link href={`/stores/${store.id}`} className="block">
                    <h3 className="font-semibold text-foreground text-base truncate">{store.name}</h3>
                    {truncatedDesc && (
                        <p className="text-sm text-foreground/60 mt-1">{truncatedDesc}</p>
                    )}
                    <div className="flex gap-4 mt-3 text-xs text-foreground/50">
                        <span>{store.fileCount} file{store.fileCount !== 1 ? "s" : ""}</span>
                        <span>{store.customCount} record{store.customCount !== 1 ? "s" : ""}</span>
                    </div>
                    <p className="text-xs text-foreground/40 mt-1">Created {formatDate(store.createdAt)}</p>
                </Link>
                <div className="flex gap-2 pt-3 mt-auto border-t border-foreground/10">
                    <Button size="sm" variant="outline" onPress={() => setEditOpen(true)}>
                        Edit
                    </Button>
                    <Button size="sm" variant="danger" onPress={() => setDeleteOpen(true)}>
                        Delete
                    </Button>
                </div>
            </div>

            {editOpen && (
                <StoreEditForm
                    store={store}
                    orgId={orgId}
                    onClose={() => setEditOpen(false)}
                />
            )}

            <ReusableConfirmModal
                isOpen={deleteOpen}
                title="Delete store"
                message={`Delete "${store.name}"? This will permanently remove all ${store.documentCount} document${store.documentCount !== 1 ? "s" : ""} (${store.fileCount} file${store.fileCount !== 1 ? "s" : ""}, ${store.customCount} record${store.customCount !== 1 ? "s" : ""}). This action cannot be undone.`}
                confirmLabel="Delete"
                onConfirm={handleDelete}
                onDismiss={() => setDeleteOpen(false)}
                isPending={deleteMutation.isPending}
            />
        </>
    );
}
