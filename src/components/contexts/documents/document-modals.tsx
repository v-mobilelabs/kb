"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { useMutation } from "@tanstack/react-query";
import { deleteDocumentAction } from "@/actions/context-actions";
import { ReusableConfirmModal } from "@/components/shared/reusable-confirm-modal";
import { DocumentCreateForm, DocumentEditForm } from "./document-form";
import { useDocumentActions } from "./document-actions-provider";
import type { ContextDocument } from "@/data/contexts/models/context-document.model";

interface Props {
    orgId: string;
    contextId: string;
}

export function DocumentModals({ orgId, contextId }: Readonly<Props>) {
    const router = useRouter();
    const { editTarget, deleteTarget, closeEdit, closeDelete } = useDocumentActions();
    const [showCreate, setShowCreate] = useState(false);

    const deleteMutation = useMutation({
        mutationFn: (doc: ContextDocument) =>
            deleteDocumentAction({ contextId, docId: doc.id }),
        onSuccess: (result: any) => {
            if (!result.ok) return;
            closeDelete();
            router.refresh();
        },
    });

    function handleCreateClose() {
        setShowCreate(false);
        router.refresh();
    }

    function handleEditClose() {
        closeEdit();
        router.refresh();
    }

    return (
        <>
            <Button onPress={() => setShowCreate(true)}>Add document</Button>

            {showCreate && (
                <DocumentCreateForm orgId={orgId} contextId={contextId} onClose={handleCreateClose} />
            )}

            {editTarget && (
                <DocumentEditForm orgId={orgId} document={editTarget} onClose={handleEditClose} />
            )}

            {deleteTarget && (
                <ReusableConfirmModal
                    isOpen
                    title="Delete document"
                    message={`Delete document (role: ${deleteTarget.role})? This action cannot be undone.`}
                    confirmLabel="Delete"
                    isPending={deleteMutation.isPending}
                    onConfirm={() => deleteMutation.mutate(deleteTarget)}
                    onDismiss={closeDelete}
                />
            )}
        </>
    );
}
