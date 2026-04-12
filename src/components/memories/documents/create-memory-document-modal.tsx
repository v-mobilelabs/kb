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
} from "@heroui/react";
import { useCreateMemoryDocumentMutation } from "@/lib/hooks/use-memory-document-mutations";

interface CreateMemoryDocumentModalProps {
    readonly memoryId: string;
    readonly onClose: () => void;
}

export function CreateMemoryDocumentModal({
    memoryId,
    onClose,
}: Readonly<CreateMemoryDocumentModalProps>) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [titleError, setTitleError] = useState("");
    const [formError, setFormError] = useState("");

    const mutation = useCreateMemoryDocumentMutation(memoryId);

    function handleSubmit(e: { preventDefault(): void }) {
        e.preventDefault();
        if (!title.trim()) {
            setTitleError("Document title is required");
            return;
        }
        setTitleError("");
        setFormError("");
        mutation.mutate(
            {
                title: title.trim(),
                content: content || "",
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
                <ModalDialog aria-label="New document">
                    <form onSubmit={handleSubmit}>
                        <ModalHeader>New document</ModalHeader>
                        <ModalBody className="flex flex-col gap-4 px-1">
                            <TextField.Root isInvalid={!!titleError} variant="secondary">
                                <Label>Title *</Label>
                                <Input
                                    placeholder="e.g. Meeting notes"
                                    value={title}
                                    maxLength={500}
                                    onChange={(e) => {
                                        setTitle(e.target.value);
                                        setTitleError("");
                                    }}
                                />
                                <FieldError>{titleError}</FieldError>
                            </TextField.Root>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="content" className="text-sm font-medium text-foreground">
                                    Content
                                </label>
                                <textarea
                                    id="content"
                                    className="w-full min-h-40 bg-surface border border-foreground/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors resize-y"
                                    placeholder="Plain text content (optional)"
                                    value={content}
                                    maxLength={10000}
                                    onChange={(e) => setContent(e.target.value)}
                                />
                                <span className="text-xs text-foreground/40 text-right">
                                    {content.length} / 10,000
                                </span>
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
                                {mutation.isPending ? (
                                    <Spinner size="sm" />
                                ) : (
                                    "Create document"
                                )}
                            </Button>
                        </ModalFooter>
                    </form>
                </ModalDialog>
            </ModalContainer>
        </ModalBackdrop>
    );
}
