'use client'

import {
    ModalBackdrop,
    ModalContainer,
    ModalDialog,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Spinner,
} from '@heroui/react'

interface ReusableConfirmModalProps {
    isOpen: boolean
    title: string
    message: string
    confirmLabel?: string
    onConfirm: () => void
    onDismiss: () => void
    isPending?: boolean
}

export function ReusableConfirmModal({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    onConfirm,
    onDismiss,
    isPending = false,
}: Readonly<ReusableConfirmModalProps>) {
    return (
        <ModalBackdrop isOpen={isOpen} onOpenChange={open => !open && !isPending && onDismiss()} isDismissable={!isPending}>
            <ModalContainer>
                <ModalDialog aria-label={title}>
                    <ModalHeader>{title}</ModalHeader>
                    <ModalBody>
                        <p className="text-sm text-foreground/80">{message}</p>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="outline" onPress={onDismiss} isDisabled={isPending}>
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onPress={onConfirm}
                            isDisabled={isPending}
                        >
                            {isPending ? <Spinner size="sm" /> : confirmLabel}
                        </Button>
                    </ModalFooter>
                </ModalDialog>
            </ModalContainer>
        </ModalBackdrop>
    )
}
