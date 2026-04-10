"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@heroui/react";
import { useState } from "react";
import type { Store } from "@/data/stores/models/store.model";
import { StoreEditForm } from "./store-edit-form";
import { ReusableConfirmModal } from "@/components/shared/reusable-confirm-modal";
import { deleteStoreAction } from "@/actions/store-actions";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface StoreHeaderClientProps {
    readonly store: Store;
    readonly orgId: string;
}

export function StoreHeaderClient({ store, orgId }: Readonly<StoreHeaderClientProps>) {
    const pathname = usePathname();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const isMonitoring = pathname.includes("/monitoring");
    const isDocuments = pathname.includes("/documents");

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
            <div className="flex flex-col gap-6">
                {/* Breadcrumb */}
                <nav className="text-sm text-foreground/50">
                    <Link href="/stores" className="hover:text-foreground transition-colors">
                        Stores
                    </Link>
                    <span className="mx-2">/</span>
                    <span className="text-foreground">{store.name}</span>
                </nav>

                {/* Store header */}
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

                {/* Tab navigation */}
                <div className="flex border-b border-foreground/10">
                    <Link
                        href={`/stores/${store.id}/monitoring`}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${isMonitoring && !isDocuments
                                ? "border-primary text-foreground"
                                : "border-transparent text-foreground/50 hover:text-foreground"
                            }`}
                    >
                        Monitoring
                    </Link>
                    <Link
                        href={`/stores/${store.id}/documents`}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${isDocuments
                                ? "border-primary text-foreground"
                                : "border-transparent text-foreground/50 hover:text-foreground"
                            }`}
                    >
                        Documents
                    </Link>
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
                message={`Delete "${store.name}"? This will permanently remove all ${store.documentCount} document${store.documentCount === 1 ? "" : "s"} (${store.customCount} custom record${store.customCount === 1 ? "" : "s"}). This action cannot be undone.`}
                confirmLabel="Delete store"
                onConfirm={handleDeleteStore}
                onDismiss={() => setDeleteOpen(false)}
                isPending={deleteMutation.isPending}
            />
        </>
    );
}
