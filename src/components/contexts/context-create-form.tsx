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
import { createContextAction } from "@/actions/context-actions";
import { queryKeys } from "@/lib/query-keys";
import { WindowSizeInput } from "./window-size-input";

interface Props {
  orgId: string;
  onClose: () => void;
}

export function ContextCreateForm({ orgId, onClose }: Readonly<Props>) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [windowSize, setWindowSize] = useState("");
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createContextAction({
        name: name.trim(),
        windowSize: windowSize ? Number.parseInt(windowSize, 10) : null,
      }),
    onSuccess: (result) => {
      if (!result.ok) {
        setFormError(result.error.message);
        return;
      }
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
    mutation.mutate();
  }

  return (
    <ModalBackdrop
      isOpen
      onOpenChange={(open) => !open && !mutation.isPending && onClose()}
      isDismissable={!mutation.isPending}
    >
      <ModalContainer>
        <ModalDialog aria-label="New context">
          <form onSubmit={handleSubmit}>
            <ModalHeader>New context</ModalHeader>
            <ModalBody className="flex flex-col gap-4 px-1">
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
              <WindowSizeInput
                value={windowSize}
                onChange={setWindowSize}
              />
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
