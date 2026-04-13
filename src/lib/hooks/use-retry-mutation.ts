"use client";

import { useState, useCallback } from "react";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";

const RETRY_DELAYS = [1000, 2000, 4000]; // ms

interface UseRetryMutationOptions<TData, TError, TVariables> extends Omit<
  UseMutationOptions<TData, TError, TVariables>,
  "mutationFn"
> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  maxRetries?: number;
  onExhausted?: (error: TError) => void;
}

/**
 * Mutation wrapper with exponential backoff auto-retry (FR-021).
 * Spinner remains visible from attempt 1 through the final retry.
 * Toast appears ONLY after all retries are exhausted.
 */
export function useRetryMutation<TData, TError, TVariables>({
  mutationFn,
  maxRetries = 3,
  onExhausted,
  onError,
  ...rest
}: UseRetryMutationOptions<TData, TError, TVariables>) {
  const [attempt, setAttempt] = useState(0);

  const retryingFn = useCallback(
    async (variables: TVariables): Promise<TData> => {
      let lastError: TError | undefined;
      setAttempt(0);

      for (let i = 0; i < maxRetries; i++) {
        try {
          setAttempt(i);
          return await mutationFn(variables);
        } catch (e) {
          lastError = e as TError;
          if (i < maxRetries - 1) {
            await new Promise<void>((resolve) =>
              setTimeout(resolve, RETRY_DELAYS[i] ?? 4000),
            );
          }
        }
      }

      throw lastError;
    },
    [mutationFn, maxRetries],
  );

  return useMutation<TData, TError, TVariables>({
    mutationFn: retryingFn,
    onError: (error, variables, onMutateResult, context) => {
      onExhausted?.(error);
      onError?.(error, variables, onMutateResult, context);
    },
    ...rest,
  });
}
