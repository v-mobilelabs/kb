"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ModalBackdrop,
  ModalContainer,
  ModalDialog,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  TextArea,
  TextField,
  Label,
  Spinner,
} from "@heroui/react";
import { useMutation } from "@tanstack/react-query";
import { createDocumentAction, updateDocumentAction } from "@/actions/context-actions";
import type { ContextDocument } from "@/data/contexts/models/context-document.model";

interface CreateProps {
  orgId: string;
  contextId: string;
  onClose: () => void;
}

export function DocumentCreateForm({ orgId: _orgId, contextId, onClose }: Readonly<CreateProps>) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        contextId,
        metadata: content.trim() ? { content: content.trim() } : undefined,
      };
      console.log("[DocumentCreateForm] sending payload:", payload);
      return createDocumentAction(payload);
    },
    onSuccess: (result) => {
      if (!result.ok) {
        setFormError(result.error.message);
        return;
      }
      // Revalidate server-side cache and refresh page to show new document
      console.log("[DocumentCreateForm] Document created successfully, calling router.refresh()");
      router.refresh();
      console.log("[DocumentCreateForm] router.refresh() called");
      onClose();
    },
    onError: (e: Error) => setFormError(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    mutation.mutate();
  }

  return (
    <ModalBackdrop
      isOpen
      onOpenChange={(open) => !open && !mutation.isPending && onClose()}
      isDismissable={!mutation.isPending}
    >
      <ModalContainer className="max-h-screen">
        <ModalDialog className="max-h-[90vh] flex flex-col" aria-label="New document">
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <ModalHeader>New document</ModalHeader>
            <ModalBody className="flex flex-col gap-4 p-1 flex-1 overflow-hidden">
              <TextField.Root variant="secondary" className="flex flex-col flex-1">
                <Label>Content</Label>
                <TextArea
                  placeholder="Enter plain text content..."
                  value={content}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                  autoFocus
                  className="max-h-[calc(90vh-250px)] resize-none"
                />
              </TextField.Root>
              {formError && <p className="text-sm text-danger">{formError}</p>}
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" onPress={onClose} isDisabled={mutation.isPending}>Cancel</Button>
              <Button type="submit" isDisabled={mutation.isPending}>
                {mutation.isPending ? <Spinner size="sm" /> : "Create"}
              </Button>
            </ModalFooter>
          </form>
        </ModalDialog>
      </ModalContainer>
    </ModalBackdrop>
  );
}

interface EditProps {
  orgId: string;
  document: ContextDocument;
  onClose: () => void;
}

export function DocumentEditForm({ orgId: _orgId, document, onClose }: Readonly<EditProps>) {
  const router = useRouter();
  const [content, setContent] = useState(
    typeof document.metadata?.content === "string" ? document.metadata.content : "",
  );
  const [formError, setFormError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      updateDocumentAction({
        contextId: document.contextId,
        docId: document.id,
        metadata: content.trim() ? { content: content.trim() } : undefined,
      }),
    onSuccess: (result) => {
      if (!result.ok) {
        setFormError(result.error.message);
        return;
      }
      // Revalidate server-side cache and refresh page
      router.refresh();
      onClose();
    },
    onError: (e: Error) => setFormError(e.message),
  });

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    mutation.mutate();
  }

  return (
    <ModalBackdrop isOpen onOpenChange={(open) => !open && !mutation.isPending && onClose()} isDismissable={!mutation.isPending}>
      <ModalContainer className="max-h-screen">
        <ModalDialog className="max-h-[90vh] flex flex-col" aria-label="Edit document">
          <form onSubmit={handleEditSubmit} className="flex flex-col h-full">
            <ModalHeader>Edit document</ModalHeader>
            <ModalBody className="flex flex-col gap-4 p-1 flex-1 overflow-hidden">
              <TextField.Root variant="secondary" className="flex flex-col flex-1">
                <Label>Content</Label>
                <TextArea
                  value={content}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                  autoFocus
                  className="max-h-[calc(90vh-250px)] resize-none"
                />
              </TextField.Root>
              {formError && <p className="text-sm text-danger">{formError}</p>}
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" onPress={onClose} isDisabled={mutation.isPending}>Cancel</Button>
              <Button type="submit" isDisabled={mutation.isPending}>
                {mutation.isPending ? <Spinner size="sm" /> : "Save changes"}
              </Button>
            </ModalFooter>
          </form>
        </ModalDialog>
      </ModalContainer>
    </ModalBackdrop>
  );
}
