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
import { useCreateMemoryMutation } from "@/lib/hooks/use-memory-mutations";

interface CreateMemoryModalProps {
    readonly onClose: () => void;
}

export function CreateMemoryModal({ onClose }: Readonly<CreateMemoryModalProps>) {
    const [description, setDescription] = useState("");
    const [documentCapacity, setDocumentCapacity] = useState("100");
    const [formError, setFormError] = useState("");

    const mutation = useCreateMemoryMutation("");

    function handleSubmit(e: { preventDefault(): void }) {
        e.preventDefault();
        const capacity = Number.parseInt(documentCapacity, 10);
        if (Number.isNaN(capacity) || capacity < 1) {
            setFormError("Document capacity must be at least 1");
            return;
        }
        setFormError("");
        mutation.mutate(
            {
                description: description.trim() || null,
                documentCapacity: capacity,
                condenseThresholdPercent: 50,
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
                <ModalDialog aria-label="New memory">
                    <form onSubmit={handleSubmit}>
                        <ModalHeader>New memory</ModalHeader>
                        <ModalBody className="flex flex-col gap-4 px-1">
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
                                {mutation.isPending ? <Spinner size="sm" /> : "Create memory"}
                            </Button>
                        </ModalFooter>
                    </form>
                </ModalDialog>
            </ModalContainer>
        </ModalBackdrop>
    );
}
