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
import { useMutation } from "@tanstack/react-query";
import { createStoreAction, updateStoreAction } from "@/actions/store-actions";
import type { Store } from "@/data/stores/models/store.model";

interface StoreFormModalProps {
    readonly orgId: string;
    readonly store?: Store;
    readonly onClose: () => void;
}

export function StoreFormModal({ orgId: _orgId, store, onClose }: Readonly<StoreFormModalProps>) {
    const isEdit = !!store;

    const [name, setName] = useState(store?.name ?? "");
    const [description, setDescription] = useState(store?.description ?? "");
    const [enableRagEvaluation, setEnableRagEvaluation] = useState(store?.enableRagEvaluation ?? true);
    const [nameError, setNameError] = useState("");
    const [formError, setFormError] = useState("");

    const mutation = useMutation<any, Error, void>({
        mutationFn: () => {
            if (isEdit && store) {
                return updateStoreAction({
                    storeId: store.id,
                    name: name.trim(),
                    description: description.trim() || null,
                    enableRagEvaluation,
                });
            }
            return createStoreAction({
                name: name.trim(),
                description: description.trim() || undefined,
                enableRagEvaluation,
            });
        },
        onSuccess: (result) => {
            if (!result.ok) {
                if (result.error.code === "CONFLICT") {
                    setNameError(result.error.message);
                } else {
                    setFormError(result.error.message);
                }
                return;
            }
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

    const title = isEdit ? "Edit store" : "New store";
    const buttonText = isEdit ? "Save changes" : "Create store";

    return (
        <ModalBackdrop isOpen onOpenChange={(open) => !open && !mutation.isPending && onClose()} isDismissable={!mutation.isPending}>
            <ModalContainer>
                <ModalDialog aria-label={title}>
                    <form onSubmit={handleSubmit}>
                        <ModalHeader>{title}</ModalHeader>
                        <ModalBody className="flex flex-col gap-4 px-1 max-h-[70vh] overflow-y-auto">
                            <div className="flex flex-col gap-1.5">
                                <Label>Name *</Label>
                                <Input
                                    variant="secondary"
                                    placeholder={isEdit ? undefined : "e.g. Product documentation"}
                                    value={name}
                                    maxLength={100}
                                    className="w-full"
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        setNameError("");
                                    }}
                                />
                                {nameError && <span className="text-xs text-danger">{nameError}</span>}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Description</Label>
                                <Input
                                    variant="secondary"
                                    placeholder="What is this store for? (optional)"
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
                                {mutation.isPending ? <Spinner size="sm" /> : buttonText}
                            </Button>
                        </ModalFooter>
                    </form>
                </ModalDialog>
            </ModalContainer>
        </ModalBackdrop>
    );
}
