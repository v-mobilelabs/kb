"use client";

import { useRouter } from "next/navigation";
import { ReusableConfirmModal } from "@/components/shared/reusable-confirm-modal";
import { useDeleteMemoryDocumentMutation } from "@/lib/hooks/use-memory-document-mutations";
import type { MemoryDocument } from "@/data/memories/types";

interface DeleteMemoryDocumentModalProps {
    readonly memoryId: string;
    readonly document: MemoryDocument;
    readonly onClose: () => void;
}

export function DeleteMemoryDocumentModal({
    memoryId,
    document,
    onClose,
}: Readonly<DeleteMemoryDocumentModalProps>) {
    const router = useRouter();
    const mutation = useDeleteMemoryDocumentMutation(memoryId);

    function handleConfirm() {
        mutation.mutate(document.id, {
            onSuccess: () => {
                onClose();
                router.push(`/memories/${memoryId}`);
            },
        });
    }

    return (
        <ReusableConfirmModal
            isOpen
            title="Delete document"
            message={`Delete "${document.title}"? This action cannot be undone.`}
            confirmLabel="Delete"
            onConfirm={handleConfirm}
            onDismiss={onClose}
            isPending={mutation.isPending}
        />
    );
}
