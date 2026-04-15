"use client";

import { useState } from "react";
import {
    ModalBackdrop,
    ModalContainer,
    ModalDialog,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Label,
    Spinner,
    Switch,
} from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStoreAction } from "@/actions/store-actions";
import { useOptimisticUpdate } from "@/lib/hooks/use-optimistic-mutation";
import type { Store } from "@/data/stores/models/store.model";

interface StoreEditFormProps {
    readonly store: Store;
    readonly orgId: string;
    readonly onClose: () => void;
}

export function StoreEditForm({ store, orgId, onClose }: Readonly<StoreEditFormProps>) {
    const queryClient = useQueryClient();
    const [name, setName] = useState(store.name);
    const [description, setDescription] = useState(store.description ?? "");
    const [enableRagEvaluation, setEnableRagEvaluation] = useState(store.enableRagEvaluation ?? true);
    const [nameError, setNameError] = useState("");
    const [formError, setFormError] = useState("");

    const mutation = useMutation<
        unknown,
        Error,
        void
    >({
        mutationFn: () =>
            updateStoreAction({
                storeId: store.id,
                name: name.trim(),
                description: description.trim() || null,
                enableRagEvaluation,
            }),
        ...useOptimisticUpdate(["store"], store.id, {
            name: name.trim(),
            description: description.trim() || null,
            enableRagEvaluation,
        }),
        onSuccess: (result: any) => {
            if (!result.ok) {
                if (result.error.code === "CONFLICT") {
                    setNameError(result.error.message);
                } else {
                    setFormError(result.error.message);
                }
                return;
            }
            // Additional invalidation for stores list
            queryClient.invalidateQueries({ queryKey: ["stores", orgId], exact: false });
            onClose();
        },
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) {
            setNameError("Store name is required");
            return;
        }
        setNameError("");
        setFormError("");
        mutation.mutate();
    }

    return (
        <ModalBackdrop isOpen onOpenChange={(open) => !open && !mutation.isPending && onClose()} isDismissable={!mutation.isPending}>
            <ModalContainer>
                <ModalDialog aria-label="Edit store">
                    <form onSubmit={handleSubmit}>
                        <ModalHeader>Edit store</ModalHeader>
                        <ModalBody className="flex flex-col gap-4 px-1 max-h-[70vh] overflow-y-auto">
                            <div className="flex flex-col gap-1.5">
                                <Label>Name *</Label>
                                <Input
                                    variant="secondary"
                                    value={name}
                                    maxLength={100}
                                    className="w-full"
                                    onChange={(e) => { setName(e.target.value); setNameError(""); }}
                                />
                                {nameError && <span className="text-xs text-danger">{nameError}</span>}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Description</Label>
                                <Input
                                    variant="secondary"
                                    placeholder="Optional description"
                                    value={description}
                                    maxLength={500}
                                    className="w-full"
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            {/* RAG Evaluation */}
                            <div className="flex items-start justify-between gap-4 rounded-lg border border-foreground/10 p-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-medium">RAG Evaluation</span>
                                    <span className="text-xs text-foreground/60">
                                        Run an LLM judge after retrieval to assess relevance and synthesise an answer. Adds latency.
                                    </span>
                                </div>
                                <Switch
                                    isSelected={enableRagEvaluation}
                                    onChange={(checked) => setEnableRagEvaluation(checked)}
                                    isDisabled={mutation.isPending}
                                    aria-label="Enable RAG Evaluation"
                                >
                                    <Switch.Control>
                                        <Switch.Thumb />
                                    </Switch.Control>
                                </Switch>
                            </div>
                            {formError && <p className="text-sm text-danger">{formError}</p>}
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="outline" onPress={onClose} isDisabled={mutation.isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" isDisabled={mutation.isPending}>
                                {mutation.isPending ? <Spinner size="sm" /> : "Save changes"}
                            </Button>
                        </ModalFooter>
                    </form>
                </ModalDialog>
            </ModalContainer>
        </ModalBackdrop>
    );
}
