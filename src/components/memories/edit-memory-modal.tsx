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
import { useUpdateMemoryMutation } from "@/lib/hooks/use-memory-mutations";
import type { Memory } from "@/data/memories/types";

interface EditMemoryModalProps {
    readonly memory: Memory;
    readonly orgId: string;
    readonly onClose: () => void;
}

export function EditMemoryModal({
    memory,
    orgId,
    onClose,
}: Readonly<EditMemoryModalProps>) {
    const [description, setDescription] = useState(memory.description ?? "");
    const [documentCapacity, setDocumentCapacity] = useState(
        String(memory.documentCapacity),
    );
    const [formError, setFormError] = useState("");

    const mutation = useUpdateMemoryMutation(orgId);

    const newCapacity = Number.parseInt(documentCapacity, 10);
    const capacityBelowCount =
        !Number.isNaN(newCapacity) && newCapacity < memory.documentCount;

    function handleSubmit(e: { preventDefault(): void }) {
        e.preventDefault();
        if (Number.isNaN(newCapacity) || newCapacity < 1) {
            setFormError("Document capacity must be at least 1");
            return;
        }
        setFormError("");
        mutation.mutate(
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
    }

    return (
        <ModalBackdrop
            isOpen
            onOpenChange={(open) => !open && !mutation.isPending && onClose()}
            isDismissable={!mutation.isPending}
        >
            <ModalContainer>
                <ModalDialog aria-label="Edit memory">
                    <form onSubmit={handleSubmit}>
                        <ModalHeader>Edit memory</ModalHeader>
                        <ModalBody className="flex flex-col gap-4 px-1">
                            <div className="flex flex-col gap-1.5">
                                <Label>Name</Label>
                                <div className="text-xs text-foreground/60 font-mono bg-surface border border-foreground/10 rounded-lg px-3 py-2">
                                    {memory.id}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Description</Label>
                                <Input
                                    variant="secondary"
                                    value={description}
                                    maxLength={1000}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What is this memory for? (optional)"
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
                                {mutation.isPending ? <Spinner size="sm" /> : "Save changes"}
                            </Button>
                        </ModalFooter>
                    </form>
                </ModalDialog>
            </ModalContainer>
        </ModalBackdrop>
    );
}
