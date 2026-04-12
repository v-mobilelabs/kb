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
} from "@heroui/react";
import { useCreateMemoryMutation, useUpdateMemoryMutation } from "@/lib/hooks/use-memory-mutations";
import type { Memory } from "@/data/memories/types";

interface MemoryFormModalProps {
    readonly orgId?: string;
    readonly memory?: Memory;
    readonly onClose: () => void;
}

export function MemoryFormModal({
    orgId = "",
    memory,
    onClose,
}: Readonly<MemoryFormModalProps>) {
    const isEdit = !!memory;

    const [description, setDescription] = useState(memory?.description ?? "");
    const [documentCapacity, setDocumentCapacity] = useState(
        String(memory?.documentCapacity ?? "100"),
    );
    const [formError, setFormError] = useState("");

    const createMutation = useCreateMemoryMutation("");
    const updateMutation = useUpdateMemoryMutation(orgId);
    const mutation = isEdit ? updateMutation : createMutation;

    const newCapacity = Number.parseInt(documentCapacity, 10);
    const capacityBelowCount =
        isEdit &&
        memory &&
        !Number.isNaN(newCapacity) &&
        newCapacity < memory.documentCount;

    function handleSubmit(e: { preventDefault(): void }) {
        e.preventDefault();
        if (Number.isNaN(newCapacity) || newCapacity < 1) {
            setFormError("Document capacity must be at least 1");
            return;
        }
        setFormError("");

        if (isEdit && memory) {
            updateMutation.mutate(
                {
                    memoryId: memory.id,
                    description: description.trim() || null,
                    documentCapacity: newCapacity,
                },
                {
                    onSuccess: () => onClose(),
                    onError: (err) => setFormError(err.message),
                },
            );
        } else {
            createMutation.mutate(
                {
                    description: description.trim() || null,
                    documentCapacity: newCapacity,
                    condenseThresholdPercent: 50,
                },
                {
                    onSuccess: () => onClose(),
                    onError: (err) => setFormError(err.message),
                },
            );
        }
    }

    const title = isEdit ? "Edit memory" : "New memory";
    const buttonText = isEdit ? "Save changes" : "Create memory";

    return (
        <ModalBackdrop
            isOpen
            onOpenChange={(open) => !open && !mutation.isPending && onClose()}
            isDismissable={!mutation.isPending}
        >
            <ModalContainer>
                <ModalDialog aria-label={title}>
                    <form onSubmit={handleSubmit}>
                        <ModalHeader>{title}</ModalHeader>
                        <ModalBody className="flex flex-col gap-4 px-1">
                            {isEdit && memory && (
                                <div className="flex flex-col gap-1.5">
                                    <Label>Name</Label>
                                    <div className="text-xs text-foreground/60 font-mono bg-surface border border-foreground/10 rounded-lg px-3 py-2">
                                        {memory.id}
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-col gap-1.5">
                                <Label>Description</Label>
                                <Input
                                    variant="secondary"
                                    placeholder="What is this memory for? (optional)"
                                    value={description}
                                    maxLength={1000}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Document capacity</Label>
                                <Input
                                    variant="secondary"
                                    type="number"
                                    min={1}
                                    value={documentCapacity}
                                    onChange={(e) => setDocumentCapacity(e.target.value)}
                                />
                            </div>
                            {capacityBelowCount && (
                                <p className="text-sm text-warning">
                                    Reducing capacity below current count (
                                    {memory.documentCount}) will automatically evict the oldest
                                    documents.
                                </p>
                            )}
                            {formError && (
                                <p className="text-sm text-danger">{formError}</p>
                            )}
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                variant="outline"
                                onPress={onClose}
                                isDisabled={mutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                isDisabled={mutation.isPending}
                            >
                                {mutation.isPending ? <Spinner size="sm" /> : buttonText}
                            </Button>
                        </ModalFooter>
                    </form>
                </ModalDialog>
            </ModalContainer>
        </ModalBackdrop>
    );
}
