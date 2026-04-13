'use client'

import { useTransition } from "react";
import {
    ModalBackdrop,
    ModalContainer,
    ModalDialog,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Spinner,
} from "@heroui/react";
import { deleteFileAction } from "@/actions/file-actions";
import { formatFileSize } from "@/data/files/lib/format-file-size";

interface DeleteFileModalProps {
    isOpen: boolean;
    fileId: string;
    fileName: string;
    fileSize: number;
    onDismiss: () => void;
    onDeleted: () => void;
}

export function DeleteFileModal({
    isOpen,
    fileId,
    fileName,
    fileSize,
    onDismiss,
    onDeleted,
}: Readonly<DeleteFileModalProps>) {
    const [isPending, startTransition] = useTransition();

    function handleConfirm() {
        startTransition(async () => {
            const result = await deleteFileAction(fileId);
            if (result.ok) {
                onDeleted();
            }
        });
    }

    return (
        <ModalBackdrop
            isOpen={isOpen}
            onOpenChange={(open) => !open && !isPending && onDismiss()}
            isDismissable={!isPending}
        >
            <ModalContainer>
                <ModalDialog aria-label="Delete file">
                    <ModalHeader>Delete file</ModalHeader>
                    <ModalBody>
                        <p className="text-sm text-foreground/80">
                            Are you sure you want to permanently delete{" "}
                            <strong className="font-semibold">{fileName}</strong>{" "}
                            ({formatFileSize(fileSize)})? This action cannot be undone.
                        </p>
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            variant="outline"
                            onPress={onDismiss}
                            isDisabled={isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onPress={handleConfirm}
                            isDisabled={isPending}
                        >
                            {isPending ? <Spinner size="sm" /> : "Delete"}
                        </Button>
                    </ModalFooter>
                </ModalDialog>
            </ModalContainer>
        </ModalBackdrop>
    );
}
