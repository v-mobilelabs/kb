"use client";

import { Button, Input, TextField, Label, FieldError } from "@heroui/react";

interface WindowSizeInputProps {
    value: string;
    onChange: (val: string) => void;
    onBlur?: () => void;
    error?: string;
}

/**
 * Numeric input for context window size (FR-002).
 * Accepts any positive integer; null = unbounded.
 */
export function WindowSizeInput({ value, onChange, onBlur, error }: Readonly<WindowSizeInputProps>) {
    return (
        <TextField.Root isInvalid={!!error} variant="secondary">
            <Label>
                Window size{" "}
                <span className="text-foreground/40 font-normal text-xs">(optional)</span>
            </Label>
            <div className="flex gap-2">
                <Input
                    type="number"
                    placeholder="Enter token size (optional)"
                    value={value}
                    min={1}
                    step={1}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    className="flex-1"
                    title="Maximum token limit for this context. Leave blank for no limit."
                />
                {value && (
                    <Button
                        variant="outline"
                        size="sm"
                        onPress={() => onChange("")}
                        aria-label="Clear window size"
                    >
                        Clear
                    </Button>
                )}
            </div>
            {error && <FieldError>{error}</FieldError>}
            <span className="text-xs text-foreground/40 mt-1">
                Maximum token limit for this context. Leave blank for no limit.
            </span>
        </TextField.Root>
    );
}
