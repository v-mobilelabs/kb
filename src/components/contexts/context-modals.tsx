"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteContextAction } from "@/actions/context-actions";
import { queryKeys } from "@/lib/query-keys";
import { ReusableConfirmModal } from "@/components/shared/reusable-confirm-modal";
import { ContextCreateForm } from "./context-create-form";
import { ContextEditForm } from "./context-edit-form";
import { useContextActions } from "./context-actions-provider";
import type { Context } from "@/data/contexts/models/context.model";

interface Props {
    orgId: string;
}

export function ContextModals({ orgId }: Readonly<Props>) {
    const queryClient = useQueryClient();
    const { editTarget, deleteTarget, closeEdit, closeDelete } = useContextActions();
    const [showCreate, setShowCreate] = useState(false);

    const deleteMutation = useMutation({
        mutationFn: (ctx: Context) => deleteContextAction({ contextId: ctx.id }),
        onSuccess: (result) => {
            if (!result.ok) return;
            queryClient.invalidateQueries({ queryKey: queryKeys.contextsList(orgId, {}) });
            closeDelete();
        },
    });

    return (
        <>
            <Button onPress={() => setShowCreate(true)}>New context</Button>

            {showCreate && (
                <ContextCreateForm orgId={orgId} onClose={() => setShowCreate(false)} />
            )}

            {editTarget && (
                <ContextEditForm orgId={orgId} context={editTarget} onClose={closeEdit} />
            )}

            {deleteTarget && (
                <ReusableConfirmModal
                    isOpen
                    title="Delete context"
                    message={`Delete "${deleteTarget.name}"? This will also delete all ${deleteTarget.documentCount} document${deleteTarget.documentCount === 1 ? "" : "s"} in this context. This action cannot be undone.`}
                    confirmLabel="Delete"
                    isPending={deleteMutation.isPending}
                    onConfirm={() => deleteMutation.mutate(deleteTarget)}
                    onDismiss={closeDelete}
                />
            )}
        </>
    );
}
