"use client";

import { useState, useCallback, useRef } from "react";
import type { ZodType, ZodError } from "zod";

type FieldErrors<T> = Partial<Record<keyof T, string>>;

/**
 * Form validation hook with blur + 500ms debounce (FR-022).
 * Validates on blur and on keystroke after 500ms debounce.
 * Submit button remains enabled — no lockout on errors.
 */
export function useValidatedForm<T extends Record<string, unknown>>(
  schema: ZodType<T>,
  values: T,
) {
  const [errors, setErrors] = useState<FieldErrors<T>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  const validate = useCallback(
    (vals: T): FieldErrors<T> => {
      const result = schema.safeParse(vals);
      if (result.success) return {};
      const fieldErrors: FieldErrors<T> = {};
      for (const issue of (result.error as ZodError).issues) {
        const key = issue.path[0] as keyof T | undefined;
        if (key) fieldErrors[key] = issue.message;
      }
      return fieldErrors;
    },
    [schema],
  );

  const onBlur = useCallback(
    (field: keyof T) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      setErrors(validate(values));
    },
    [validate, values],
  );

  const onKeyChange = useCallback(
    (field: keyof T) => {
      clearTimeout(debounceTimers.current[field as string]);
      debounceTimers.current[field as string] = setTimeout(() => {
        if (touched[field]) setErrors(validate(values));
      }, 500);
    },
    [validate, values, touched],
  );

  const isValid = Object.keys(validate(values)).length === 0;

  return { errors, touched, isValid, onBlur, onKeyChange };
}
