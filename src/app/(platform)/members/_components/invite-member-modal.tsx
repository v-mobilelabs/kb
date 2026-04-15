"use client";

import {
  ModalBackdrop,
  ModalContainer,
  ModalDialog,
  ModalHeader,
  ModalBody,
} from "@heroui/react";
import { InviteMemberForm } from "./invite-member-form";

interface InviteMemberModalProps {
  orgId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function InviteMemberModal({
  orgId,
  isOpen,
  onOpenChange,
  onSuccess,
}: Readonly<InviteMemberModalProps>) {
  return (
    <ModalBackdrop
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={true}
    >
      <ModalContainer>
        <ModalDialog aria-label="Invite Member">
          <ModalHeader>Invite Member</ModalHeader>
          <ModalBody className="pb-6">
            <InviteMemberForm
              orgId={orgId}
              onSuccess={() => {
                onSuccess();
                onOpenChange(false);
              }}
              onCancel={() => onOpenChange(false)}
            />
          </ModalBody>
        </ModalDialog>
      </ModalContainer>
    </ModalBackdrop>
  );
}
