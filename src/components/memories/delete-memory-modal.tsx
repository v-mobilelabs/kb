"use client";

import { ReusableConfirmModal } from "@/components/shared/reusable-confirm-modal";
import { useDeleteMemoryMutation } from "@/lib/hooks/use-memory-mutations";
import type { Memory } from "@/data/memories/types";

interface DeleteMemoryModalProps {
    readonly memory: Memory;
    readonly orgId: string;
    readonly onClose: () => void;
}

export function DeleteMemoryModal({
    memory,
    orgId,
    onClose,
}: Readonly<DeleteMemoryModalProps>) {
    const mutation = useDeleteMemoryMutation(orgId);

    function handleConfirm() {
        mutation.mutate(memory.id, {
            onSuccess: () => onClose(),
        });
    }

    return (
        <ReusableConfirmModal
            isOpen
            title="Delete memory"
            message={`Delete this memory? This will permanently remove all ${memory.documentCount} document${memory.documentCount === 1 ? "" : "s"}. This action cannot be undone.`}
            confirmLabel="Delete"
            onConfirm={handleConfirm}
            onDismiss={onClose}
            isPending={mutation.isPending}
        />
    );
}
