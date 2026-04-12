"use client";

import {
    createContext,
    useContext,
    useMemo,
    useState,
    useCallback,
} from "react";
import { useRouter } from "next/navigation";
import type { Memory } from "@/data/memories/types";
import { MemoryFormModal } from "./memory-form-modal";
import { DeleteMemoryModal } from "./delete-memory-modal";

interface MemoryActionsContextValue {
    openCreate: () => void;
    openEdit: (memory: Memory) => void;
    openDelete: (memory: Memory) => void;
}

const MemoryActionsContext = createContext<MemoryActionsContextValue | null>(null);

export function useMemoryActions() {
    const ctx = useContext(MemoryActionsContext);
    if (!ctx) throw new Error("useMemoryActions must be used inside MemoryActionsProvider");
    return ctx;
}

interface MemoryActionsProviderProps {
    orgId: string;
    children: React.ReactNode;
}

export function MemoryActionsProvider({ orgId, children }: Readonly<MemoryActionsProviderProps>) {
    const router = useRouter();
    const [createOpen, setCreateOpen] = useState(false);
    const [memoryToEdit, setMemoryToEdit] = useState<Memory | null>(null);
    const [memoryToDelete, setMemoryToDelete] = useState<Memory | null>(null);

    const handleModalClose = useCallback(() => {
        setCreateOpen(false);
        setMemoryToEdit(null);
        setMemoryToDelete(null);
        router.refresh();
    }, [router]);

    const openCreate = useCallback(() => setCreateOpen(true), []);
    const openEdit = useCallback((memory: Memory) => setMemoryToEdit(memory), []);
    const openDelete = useCallback((memory: Memory) => setMemoryToDelete(memory), []);

    const value = useMemo(
        () => ({ openCreate, openEdit, openDelete }),
        [openCreate, openEdit, openDelete],
    );

    return (
        <MemoryActionsContext.Provider value={value}>
            {children}

            {createOpen && (
                <MemoryFormModal orgId={orgId} onClose={handleModalClose} />
            )}

            {memoryToEdit && (
                <MemoryFormModal
                    orgId={orgId}
                    memory={memoryToEdit}
                    onClose={handleModalClose}
                />
            )}

            {memoryToDelete && (
                <DeleteMemoryModal
                    orgId={orgId}
                    memory={memoryToDelete}
                    onClose={handleModalClose}
                />
            )}
        </MemoryActionsContext.Provider>
    );
}
