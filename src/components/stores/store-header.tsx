"use client";

import Link from "next/link";
import { Button } from "@heroui/react";
import { useState } from "react";
import type { Store } from "@/data/stores/models/store.model";
import { StoreEditForm } from "./store-edit-form";
import { ReusableConfirmModal } from "@/components/shared/reusable-confirm-modal";
import { deleteStoreAction } from "@/actions/store-actions";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface StoreHeaderProps {
    readonly store: Store;
    readonly orgId: string;
}

export function StoreHeader({ store, orgId }: Readonly<StoreHeaderProps>) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const deleteMutation = useMutation({
        mutationFn: () => deleteStoreAction({ storeId: store.id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stores", orgId], exact: false });
            router.push("/stores");
        },
    });

    function handleDeleteStore() {
        deleteMutation.mutate();
    }

    return (
        <>
            {/* Breadcrumb */}
            <nav className="text-sm text-foreground/50">
                <Link href="/stores" className="hover:text-foreground transition-colors">
                    Stores
                </Link>
                <span className="mx-2">/</span>
                <span className="text-foreground">{store.name}</span>
            </nav>

            {/* Store info & controls */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{store.name}</h1>
                    {store.description && (
                        <p className="text-sm text-foreground/60 mt-1">{store.description}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-foreground/40">
                        <span>{store.customCount} record{store.customCount === 1 ? "" : "s"}</span>
                    </div>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onPress={() => setEditOpen(true)}>
                        Edit
                    </Button>
                    <Button variant="danger" size="sm" onPress={() => setDeleteOpen(true)}>
                        Delete store
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

            {deleteOpen && (
                <ReusableConfirmModal
                    isOpen={true}
                    title="Delete store"
                    message={`Delete "${store.name}"? This action cannot be undone. All documents will be permanently deleted.`}
                    confirmLabel="Delete"
                    onConfirm={handleDeleteStore}
                    onDismiss={() => setDeleteOpen(false)}
                    isPending={deleteMutation.isPending}
                />
            )}
        </>
    );
}
