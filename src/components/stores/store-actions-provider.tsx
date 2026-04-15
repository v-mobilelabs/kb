"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import type { Store } from "@/data/stores/models/store.model";
import { StoreFormModal } from "./store-form-modal";
import { ReusableConfirmModal } from "@/components/shared/reusable-confirm-modal";
import { deleteStoreAction } from "@/actions/store-actions";

interface StoreActionsContextValue {
    openCreate: () => void;
    openEdit: (store: Store) => void;
    openDelete: (store: Store) => void;
}

const StoreActionsContext = createContext<StoreActionsContextValue>({
    openCreate: () => { },
    openEdit: () => { },
    openDelete: () => { },
});

export function useStoreActions() {
    return useContext(StoreActionsContext);
}

interface StoreActionsProviderProps {
    orgId: string;
    children: React.ReactNode;
}

export function StoreActionsProvider({ orgId, children }: Readonly<StoreActionsProviderProps>) {
    const router = useRouter();
    const [createOpen, setCreateOpen] = useState(false);
    const [storeToEdit, setStoreToEdit] = useState<Store | null>(null);
    const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);

    const deleteMutation = useMutation({
        mutationFn: (storeId: string) => deleteStoreAction({ storeId }),
        onSuccess: (result: any) => {
            if (!result.ok) return;
            setStoreToDelete(null);
            router.refresh();
        },
    });

    function handleModalClose() {
        setCreateOpen(false);
        setStoreToEdit(null);
        router.refresh();
    }

    const contextValue = useMemo(
        () => ({
            openCreate: () => setCreateOpen(true),
            openEdit: setStoreToEdit,
            openDelete: setStoreToDelete,
        }),
        [],
    );

    return (
        <StoreActionsContext.Provider value={contextValue}>
            {children}

            {createOpen && (
                <StoreFormModal orgId={orgId} onClose={handleModalClose} />
            )}

            {storeToEdit && (
                <StoreFormModal
                    store={storeToEdit}
                    orgId={orgId}
                    onClose={handleModalClose}
                />
            )}

            {storeToDelete && (
                <ReusableConfirmModal
                    isOpen
                    title="Delete store"
                    message={`Delete "${storeToDelete.name}"? This will permanently remove all ${storeToDelete.documentCount} document${storeToDelete.documentCount === 1 ? "" : "s"} (${storeToDelete.fileCount} file${storeToDelete.fileCount === 1 ? "" : "s"}, ${storeToDelete.customCount} record${storeToDelete.customCount === 1 ? "" : "s"}). This action cannot be undone.`}
                    confirmLabel="Delete"
                    onConfirm={() => deleteMutation.mutate(storeToDelete.id)}
                    isPending={deleteMutation.isPending}
                    onDismiss={() => setStoreToDelete(null)}
                />
            )}
        </StoreActionsContext.Provider>
    );
}
