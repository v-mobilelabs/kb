"use client";

import { useState } from "react";
import {
  Button,
  Input,
  TextField,
  Select,
  ListBox,
  ListBoxItem,
  Label,
  Spinner,
} from "@heroui/react";
import { useMutation } from "@tanstack/react-query";
import { addOrgMemberAction } from "@/actions/org-member-actions";
import type { BaseRole } from "@/data/organizations/models/org-membership.model";
import type { Result, AppError } from "@/lib/result";

interface InviteMemberFormProps {
  orgId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function InviteMemberForm({
  orgId,
  onSuccess,
  onCancel,
}: Readonly<InviteMemberFormProps>) {
  const [email, setEmail] = useState("");
  const [baseRole, setBaseRole] = useState<BaseRole>("member");
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState("");

  const mutation = useMutation<
    Result<{ userId: string; email: string; baseRole: string }, AppError>,
    Error,
    void
  >({
    mutationFn: () =>
      addOrgMemberAction({
        orgId,
        email: email.trim().toLowerCase(),
        baseRole,
      }),
    onSuccess: (result: any) => {
      if (!result.ok) {
        setFormError(result.error.message || "Failed to add member");
        return;
      }
      setEmail("");
      setBaseRole("member");
      setEmailError("");
      setFormError("");
      onSuccess();
    },
    onError: () => {
      setFormError("An error occurred while adding the member");
    },
  });

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError("Invalid email address");
      return;
    }

    setEmailError("");
    setFormError("");
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
      <TextField.Root
        isInvalid={!!emailError}
        className="flex flex-col gap-1.5"
      >
        <Label>Email Address</Label>
        <Input
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={mutation.isPending}
          className="w-full"
        />
        {emailError && <span className="text-xs text-danger">{emailError}</span>}
      </TextField.Root>

      <div className="flex flex-col gap-1.5">
        <Label>Role</Label>
        <Select.Root
          selectedKey={baseRole}
          onSelectionChange={(key) => setBaseRole(key as BaseRole)}
          isDisabled={mutation.isPending}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBoxItem key="member" textValue="member">
                Member — Read-only access
              </ListBoxItem>
              <ListBoxItem key="admin" textValue="admin">
                Admin — Manage members & content
              </ListBoxItem>
            </ListBox>
          </Select.Popover>
        </Select.Root>
      </div>

      {formError && <div className="text-sm text-danger">{formError}</div>}

      <div className="flex gap-2 justify-end pt-4">
        <Button
          isDisabled={mutation.isPending}
          onPress={onCancel}
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isDisabled={mutation.isPending || !email.trim()}
          onPress={() => {
            if (!mutation.isPending) {
              const form = document.querySelector("form");
              if (form) form.requestSubmit();
            }
          }}
        >
          {mutation.isPending ? <Spinner size="sm" /> : "Send Invite"}
        </Button>
      </div>
    </form>
  );
}
