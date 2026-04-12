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
    TextField,
    Label,
    FieldError,
    Spinner,
    Switch,
} from "@heroui/react";
import { useMutation } from "@tanstack/react-query";
import { createStoreAction } from "@/actions/store-actions";
import { useOptimisticListAdd } from "@/lib/hooks/use-optimistic-mutation";

interface StoreCreateFormProps {
    readonly orgId: string;
    readonly onClose: () => void;
}

export function StoreCreateForm({ orgId, onClose }: Readonly<StoreCreateFormProps>) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [enableRagEvaluation, setEnableRagEvaluation] = useState(true);
    const [nameError, setNameError] = useState("");
    const [formError, setFormError] = useState("");

    const mutation = useMutation<
        any,
        Error,
        void
    >({
        mutationFn: () => createStoreAction({ name: name.trim(), description: description.trim() || undefined, enableRagEvaluation }),
        ...useOptimisticListAdd("stores", orgId),
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

    return (
        <ModalBackdrop isOpen onOpenChange={(open) => !open && !mutation.isPending && onClose()} isDismissable={!mutation.isPending}>
            <ModalContainer>
                <ModalDialog aria-label="New store">
                    <form onSubmit={handleSubmit}>
                        <ModalHeader>New store</ModalHeader>
                        <ModalBody className="flex flex-col gap-4 px-1">
                            <TextField.Root isInvalid={!!nameError} variant="secondary">
                                <Label>Name *</Label>
                                <Input
                                    placeholder="e.g. Product documentation"
                                    value={name}
                                    maxLength={100}
                                    onChange={(e) => { setName(e.target.value); setNameError(""); }}
                                />
                                <FieldError>{nameError}</FieldError>
                            </TextField.Root>
                            <TextField.Root variant="secondary">
                                <Label>Description</Label>
                                <Input
                                    placeholder="What is this store for? (optional)"
                                    value={description}
                                    maxLength={500}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </TextField.Root>
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
                                {mutation.isPending ? <Spinner size="sm" /> : "Create store"}
                            </Button>
                        </ModalFooter>
                    </form>
                </ModalDialog>
            </ModalContainer>
        </ModalBackdrop>
    );
}
