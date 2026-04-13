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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateContextAction } from "@/actions/context-actions";
import { queryKeys } from "@/lib/query-keys";
import { useConflictHandler } from "@/lib/hooks/use-conflict-handler";
import { WindowSizeInput } from "./window-size-input";
import type { Context } from "@/data/contexts/models/context.model";

interface Props {
  orgId: string;
  context: Context;
  onClose: () => void;
}

export function ContextEditForm({ orgId, context, onClose }: Readonly<Props>) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(context.name);
  const [windowSize, setWindowSize] = useState(
    context.windowSize == null ? "" : String(context.windowSize),
  );
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState("");
  const [conflictError, setConflictError] = useState("");

  const { handleConflict } = useConflictHandler({
    queryKeys: [
      queryKeys.contextDetail(context.id),
      queryKeys.contextsList(orgId, {}),
    ],
    onConflict: () =>
      setConflictError("This context was updated from another session. Data refreshed — please review and try again."),
  });

  const mutation = useMutation({
    mutationFn: () =>
      updateContextAction({
        contextId: context.id,
        name: name.trim(),
        windowSize: windowSize ? Number.parseInt(windowSize, 10) : null,
        currentName: context.name,
      }),
    onSuccess: async (result) => {
      if (!result.ok) {
        if (result.error.code === "CONFLICT") {
          await handleConflict();
        } else {
          setFormError(result.error.message);
        }
        return;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.contextDetail(context.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contextsList(orgId, {}) });
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("Context name is required");
      return;
    }
    if (windowSize && (Number.isNaN(Number.parseInt(windowSize, 10)) || Number.parseInt(windowSize, 10) <= 0)) {
      setFormError("Window size must be a positive integer");
      return;
    }
    setNameError("");
    setFormError("");
    setConflictError("");
    mutation.mutate();
  }

  return (
    <ModalBackdrop
      isOpen
      onOpenChange={(open) => !open && !mutation.isPending && onClose()}
      isDismissable={!mutation.isPending}
    >
      <ModalContainer>
        <ModalDialog aria-label="Edit context">
          <form onSubmit={handleSubmit}>
            <ModalHeader>Edit context</ModalHeader>
            <ModalBody className="flex flex-col gap-4 px-1">
              {conflictError && (
                <p className="text-sm text-warning rounded bg-warning/10 p-3">{conflictError}</p>
              )}
              <TextField.Root isInvalid={!!nameError} variant="secondary">
                <Label>Name *</Label>
                <Input
                  placeholder="e.g. Customer support context"
                  value={name}
                  maxLength={100}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameError("");
                  }}
                />
                <FieldError>{nameError}</FieldError>
              </TextField.Root>
              <WindowSizeInput value={windowSize} onChange={setWindowSize} />
              {formError && <p className="text-sm text-danger">{formError}</p>}
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" onPress={onClose} isDisabled={mutation.isPending}>
                Cancel
              </Button>
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
